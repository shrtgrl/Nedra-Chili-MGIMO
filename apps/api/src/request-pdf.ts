import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { REQUEST_TYPE_LABELS } from './request-types.js';

const labels: Record<string, string> = REQUEST_TYPE_LABELS;
export async function requestPdf(data: { id: string; type: string; purpose: string; fullName: string; groupName: string | null; readyAt: Date; faculty?: string; program?: string; year?: number; draft?: boolean }): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Демонстрационный документ МУКПиД', Author: 'Конкурсный прототип' } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  doc.font(fileURLToPath(new URL('../assets/DejaVuSans.ttf', import.meta.url)));
  doc.fontSize(10).fillColor('#496458').text('МУКПиД | Онлайн-деканат', { characterSpacing: 1 });
  doc.moveDown().fontSize(12).fillColor('#a12c3c').text('КОНЦЕПТ ДЛЯ КОНКУРСА');
  doc.fontSize(9).text('Все данные вымышлены. Не является официальным документом вуза.');
  if (data.draft) doc.moveDown().fontSize(20).fillColor('#a12c3c').text('ЧЕРНОВИК — НЕ ВЫДАН');
  doc.moveDown(2).fontSize(21).fillColor('#173f32').text(data.type === 'study' ? labels.study : 'Подтверждение обработки заявки');
  doc.moveDown().fontSize(9).fillColor('#555555').text(`Заявка № ${data.id}`);
  doc.text(`${data.draft ? 'Дата предпросмотра' : 'Дата готовности'}: ${data.readyAt.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)`);
  doc.moveDown(2).fontSize(12).fillColor('#222222');
  doc.text(`Студент: ${data.fullName}`);
  doc.moveDown().text(`Учебная группа: ${data.groupName ?? 'Не указана'}`);
  if (data.faculty) doc.moveDown().text(`Факультет: ${data.faculty}`);
  if (data.program) doc.moveDown().text(`Направление: ${data.program}`);
  if (data.year) doc.moveDown().text(`Курс: ${data.year}`);
  doc.moveDown().text(`Тип заявки: ${labels[data.type] ?? 'Заявка'}`);
  doc.moveDown().text(`Цель: ${data.purpose || 'Не указана'}`);
  doc.moveDown(2).text(data.type === 'study' ? 'Настоящий демонстрационный бланк подтверждает обучение указанного вымышленного студента в конкурсном прототипе МУКПиД.' : 'Обработка заявки завершена в конкурсном прототипе. Этот бланк не заменяет приказ, решение об отпуске или допуск к пересдаче.');
  doc.moveDown(2).fontSize(10).fillColor('#555555').text('Сотрудник учебного офиса: Демонстрационная подпись');
  doc.text('Печать и реальное факсимиле не используются.');
  doc.end();
  return result;
}
