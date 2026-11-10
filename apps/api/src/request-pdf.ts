import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';

const labels: Record<string, string> = { study: 'Справка об обучении', order: 'Копия приказа', leave: 'Академический отпуск', retake: 'Пересдача экзамена' };
export async function requestPdf(data: { id: string; type: string; purpose: string; fullName: string; groupName: string | null; readyAt: Date }): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Демонстрационный документ МУКПиД', Author: 'Конкурсный прототип' } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  doc.font(fileURLToPath(new URL('../assets/DejaVuSans.ttf', import.meta.url)));
  doc.fontSize(10).fillColor('#496458').text('МУКПиД | Онлайн-деканат', { characterSpacing: 1 });
  doc.moveDown().fontSize(12).fillColor('#a12c3c').text('КОНЦЕПТ ДЛЯ КОНКУРСА');
  doc.fontSize(9).text('Все данные вымышлены. Не является официальным документом вуза.');
  doc.moveDown(2).fontSize(21).fillColor('#173f32').text(data.type === 'study' ? labels.study : 'Подтверждение обработки заявки');
  doc.moveDown().fontSize(9).fillColor('#555555').text(`Заявка № ${data.id}`);
  doc.text(`Дата готовности: ${data.readyAt.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)`);
  doc.moveDown(2).fontSize(12).fillColor('#222222');
  doc.text(`Студент: ${data.fullName}`);
  doc.moveDown().text(`Учебная группа: ${data.groupName ?? 'Не указана'}`);
  doc.moveDown().text(`Тип заявки: ${labels[data.type] ?? 'Заявка'}`);
  doc.moveDown().text(`Цель: ${data.purpose || 'Не указана'}`);
  doc.moveDown(2).text(data.type === 'study' ? 'Настоящий демонстрационный бланк подтверждает обучение указанного вымышленного студента в конкурсном прототипе МУКПиД.' : 'Обработка заявки завершена в конкурсном прототипе. Этот бланк не заменяет приказ, решение об отпуске или допуск к пересдаче.');
  doc.moveDown(2).fontSize(10).fillColor('#555555').text('Сотрудник учебного офиса: Демонстрационная подпись');
  doc.text('Печать и реальное факсимиле не используются.');
  doc.end();
  return result;
}
