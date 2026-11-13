import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  NotFoundException,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

import { FilesService } from '../files/files.service.js';
import { TransformReportFormInterceptor } from '../common/interceptors/transform-report-form.interceptor.js';

import { CreateReportDto } from './create-report.dto.js';
import { UpdateReportDto } from './update-report.dto.js';
import { ReportsService } from './reports.service.js';

import {
  ApiListReports,
  ApiFindReport,
  ApiCreateReport,
  ApiUpdateReport,
  ApiDeleteReport,
} from './reports.openapi.js';
import type { Response } from 'express';

interface AuthedRequest {
  user?: { id: string; role: string };
}

@Controller('reports')
@ApiTags('Reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly filesService: FilesService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiListReports()
  findAll(@Req() req: AuthedRequest) {
    return this.reportsService.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiFindReport()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.reportsService.findOne(id, req.user);
  }

  @Get(':id/pdf')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Retrieve a report PDF',
    description: `
Returns the PDF associated with a report.

Access follows the same visibility rules as GET /reports/:id:

- Anonymous, USER and HR can access published reports.
- ADMIN can access all reports.
- BUSINESS can access published reports and their own drafts.

The endpoint returns the PDF as application/pdf.
    `,
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Report id.',
  })
  @ApiOkResponse({
    description: 'PDF file returned successfully.',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Report not found, inaccessible draft, or PDF not found.',
  })
  @ApiBadRequestResponse({
    description: 'id is not a valid UUID.',
  })
  async getReportPdf(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.findOne(id, req.user);

    if (!report.fileUrl) {
      throw new NotFoundException('PDF não encontrado.');
    }

    const file = await this.filesService.readPdf(report.fileUrl);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Content-Length': file.length,
      'X-Content-Type-Options': 'nosniff',
    });

    return res.send(file);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    TransformReportFormInterceptor,
  )
  @ApiCreateReport()
  async create(
    @Body() dto: CreateReportDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthedRequest,
  ) {
    const user = req.user!;

    if (user.role === 'BUSINESS' && dto.published) {
      throw new ForbiddenException('Only admins can publish reports');
    }

    const fileUrl = await this.filesService.savePdf(file);

    try {
      return await this.reportsService.create(dto, user.id, fileUrl);
    } catch (error) {
      try {
        await this.filesService.deletePdf(fileUrl);
      } catch {
        // A falha na limpeza não deve substituir o erro original.
      }

      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    TransformReportFormInterceptor,
  )
  @ApiUpdateReport()
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReportDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthedRequest,
  ) {
    const existingReport = await this.reportsService.findOne(
      id,
      req.user,
    );

    // Sem novo PDF: preserva o arquivo atual.
    if (!file) {
      return this.reportsService.update(id, dto, req.user);
    }

    // Armazena o novo PDF antes de atualizar o banco.
    const newFileUrl = await this.filesService.savePdf(file);

    let updatedReport;

    try {
      updatedReport = await this.reportsService.update(
        id,
        dto,
        req.user,
        newFileUrl,
      );
    } catch (error) {
      try {
        await this.filesService.deletePdf(newFileUrl);
      } catch {
        // A falha na limpeza não deve substituir o erro original.
      }

      throw error;
    }

    // Após atualizar o banco, verifica se o PDF antigo pode ser removido.
    const oldFileUrl = existingReport.fileUrl;

    if (
      oldFileUrl !== newFileUrl &&
      this.filesService.isManagedFileReference(oldFileUrl)
    ) {
      try {
        const isStillUsed =
          await this.reportsService.isFileUsedByAnotherReport(
            oldFileUrl,
            id,
          );

        if (!isStillUsed) {
          await this.filesService.deletePdf(oldFileUrl);
        }
      } catch {
        // A atualização já foi concluída.
        // Uma falha na limpeza não deve afetar o novo arquivo.
      }
    }

    return updatedReport;
  }
    
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiDeleteReport()
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    const report = await this.reportsService.findOne(id, req.user);

    const result = await this.reportsService.remove(id, req.user);

    const fileUrl = report.fileUrl;

    if (this.filesService.isManagedFileReference(fileUrl)) {
      try {
        const isStillUsed =
          await this.reportsService.isFileUsedByAnotherReport(
            fileUrl,
            id,
          );

        if (!isStillUsed) {
          await this.filesService.deletePdf(fileUrl);
        }
      } catch {
        // A exclusão do relatório já foi concluída.
        // Uma falha na limpeza não deve desfazer essa operação.
      }
    }

    return result;
  }

}
