import { Module } from '@nestjs/common';
import { FilesService } from './files.service.js';
import { FILE_STORAGE } from './interfaces/file-storage.token.js';
import { LocalStorageProvider } from './providers/local-storage.provider.js';

@Module({
  providers: [
    FilesService,
    {
      provide: FILE_STORAGE,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
