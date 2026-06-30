import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

const doc = new Document({
  defaultTabStop: 720,
  styles: {
    default: {
      document: {
        run: {
          font: 'Times New Roman',
          size: 28,
          color: '000000',
        },
        paragraph: {
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            before: 120,
            after: 120,
            line: 240,
          },
          indent: {
            firstLine: 720,
          }
        }
      }
    }
  },
  sections: [{
    children: [
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          before: 120,
          after: 120,
          line: 240,
        },
        indent: {
          firstLine: 720,
        },
        children: [
          new TextRun({
            text: 'Hello world inline test',
            font: 'Times New Roman',
            size: 28,
            color: '000000',
          })
        ]
      })
    ]
  }]
});

Packer.toArrayBuffer(doc).then(() => {
  console.log('PARAGRAPH OPTIONS TEST SUCCESS');
  process.exit(0);
}).catch(err => {
  console.error('PARAGRAPH OPTIONS TEST FAILED', err);
  process.exit(1);
});