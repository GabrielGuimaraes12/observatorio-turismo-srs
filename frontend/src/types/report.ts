export interface Report {
  id: string;
  name: string;
  period: string;
  periodId: string | null;
  periodStartDate: string;
  periodEndDate: string;
  sector: string;
  sectorId: string | null;
  description: string;
  pdfUrl: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}