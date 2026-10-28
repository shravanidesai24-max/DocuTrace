import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from backend.samples.sample_docs import SAMPLE_DOCUMENTS

out_dir = os.path.join(os.getcwd(), 'test_documents')
os.makedirs(out_dir, exist_ok=True)
styles = getSampleStyleSheet()

for key, doc in SAMPLE_DOCUMENTS.items():
    # Save TXT version
    txt_filename = f"{key}.txt"
    txt_path = os.path.join(out_dir, txt_filename)
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(f"{doc['title']}\n")
        f.write(f"Category: {doc['category']}\n")
        f.write(f"Filename: {doc['filename']}\n\n")
        f.write(doc['text'])
    
    # Save PDF version
    pdf_filename = doc['filename'] if doc['filename'].endswith('.pdf') else f"{key}.pdf"
    pdf_path = os.path.join(out_dir, pdf_filename)
    
    doc_pdf = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    story = []
    
    title_style = ParagraphStyle('T', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor('#1e3a5f'))
    sub_style = ParagraphStyle('S', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748b'))
    body_style = ParagraphStyle('B', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=17, textColor=colors.HexColor('#1e293b'))
    
    story.append(Paragraph(doc['title'], title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Category: <b>{doc['category']}</b> | File: {doc['filename']}", sub_style))
    story.append(Spacer(1, 14))
    story.append(Paragraph(doc['text'], body_style))
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"Summary: {doc['description']}", sub_style))
    
    doc_pdf.build(story)
    print(f"Generated test file: {pdf_filename} and {txt_filename}")

print(f"All sample verification documents created in: {out_dir}")
