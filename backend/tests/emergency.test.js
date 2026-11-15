const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const PDFDocument = require('pdfkit');

describe('Emergency Card & PDF Generation', () => {
  test('PDFKit creates valid PDF stream with correct binary header', async () => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));

    const pdfGenerated = new Promise(resolve => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });

    // Write Emergency Card Header
    doc.fontSize(22).fillColor('#0d9488').text('MEDICARE EMERGENCY HEALTH CARD', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).fillColor('#111827').text('Patient: Robert Johnson');
    doc.text('Blood Group: O+');
    doc.text('Emergency Contact: Sarah Johnson (555-0192)');
    doc.end();

    const pdfBuffer = await pdfGenerated;
    assert.ok(pdfBuffer.length > 0);
    // PDF magic bytes: %PDF-
    assert.equal(pdfBuffer.toString('utf8', 0, 5), '%PDF-');
  });
});
