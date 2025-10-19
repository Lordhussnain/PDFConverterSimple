const fastify = require('fastify')({ logger: true });
const multipart = require('@fastify/multipart');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs').promises;
const PDFParser = require('pdf2json');
const ExcelJS = require('exceljs');

// Register multipart
fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

// Existing /convert route for PDF to Excel (from previous code)...
// Route to handle PDF upload and conversion
fastify.post('/convert', async (request, reply) => {
  try {
    // Get uploaded file
    const data = await request.file();
    if (!data || path.extname(data.filename).toLowerCase() !== '.pdf') {
      return reply.status(400).send({ error: 'Please upload a valid PDF file' });
    }

    // Save uploaded PDF temporarily
    const pdfPath = path.join(__dirname, 'uploads', data.filename);
    await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
    const pdfBuffer = await data.toBuffer();
    await fs.writeFile(pdfPath, pdfBuffer);

    // Parse PDF to JSON
    const pdfParser = new PDFParser();
    const pdfData = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData) => reject(errData));
      pdfParser.on('pdfParser_dataReady', (pdfData) => resolve(pdfData));
      pdfParser.parseBuffer(pdfBuffer);
    });

    // Extract text from PDF (example: simple text extraction)
    const textContent = [];
    pdfData.Pages.forEach((page) => {
      page.Texts.forEach((text) => {
        const decodedText = decodeURIComponent(text.R[0].T); // Decode text
        textContent.push(decodedText);
      });
    });

    // Create Excel file using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.columns = [{ header: 'Content', key: 'content', width: 50 }];

    // Add extracted text to Excel
    textContent.forEach((text, index) => {
      worksheet.addRow({ content: text });
    });

    // Save Excel file
    const excelPath = path.join(__dirname, 'downloads', `converted-${Date.now()}.xlsx`);
    await fs.mkdir(path.join(__dirname, 'downloads'), { recursive: true });
    await workbook.xlsx.writeFile(excelPath);

    // Send the Excel file as a download
    reply.header('Content-Disposition', `attachment; filename=${path.basename(excelPath)}`);
    reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const fileBuffer = await fs.readFile(excelPath);

    // Clean up temporary files
    await fs.unlink(pdfPath);
    await fs.unlink(excelPath);

    return reply.send(fileBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Error processing file' });
  }
});
// New route for PDF to DOCX
// REPLACE your entire /convert-to-docx route with THIS:
fastify.post('/convert-to-docx', async (request, reply) => {
  try {
    const data = await request.file();
    if (!data || path.extname(data.filename).toLowerCase() !== '.pdf') {
      return reply.status(400).send({ error: 'Please upload a valid PDF file' });
    }

    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const safePdfName = `input-${Date.now()}.pdf`;
    const pdfPath = path.join(uploadDir, safePdfName);
    const pdfBuffer = await data.toBuffer();
    await fs.writeFile(pdfPath, pdfBuffer);

    const downloadDir = path.join(__dirname, 'downloads');
    await fs.mkdir(downloadDir, { recursive: true });
    const safeDocxName = `converted-${Date.now()}.docx`;
    const docxPath = path.join(downloadDir, safeDocxName);

    const pythonScript = path.join(__dirname, 'scripts', 'convert_pdf_to_docx.py');
    const command = `python "${pythonScript}" "${pdfPath}" "${docxPath}"`;
    
    const { stdout, stderr } = await execAsync(command);

    // 🔥 FIX: Only check for REAL errors, ignore INFO messages!
    if (stderr && !stderr.includes('Conversion successful')) {
      fastify.log.error(stderr);
      return reply.status(500).send({ error: 'Conversion failed: ' + stderr });
    }

    fastify.log.info(stdout);

    reply.header('Content-Disposition', `attachment; filename=${safeDocxName}`);
    reply.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const docxBuffer = await fs.readFile(docxPath);

    await fs.unlink(pdfPath);
    await fs.unlink(docxPath);

    return reply.send(docxBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Error: ' + error.message });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000 });
    console.log('Server running on port', fastify.server.address().port);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();