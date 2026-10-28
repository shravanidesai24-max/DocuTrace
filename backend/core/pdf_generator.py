"""
DocuTrace — Sentence-by-Sentence Plagiarism & Substitution Inspection PDF Generator
Generates an executive, color-coded PDF inspection report showing exact matches,
paraphrased text, and word-level substitutions between two documents.
"""

import io
import time
import html
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    along with professional header and footer on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        width, height = letter

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1e3a5f"))
            self.drawString(36, height - 28, "DocuTrace")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(88, height - 28, "|   Sentence-by-Sentence Plagiarism & Substitution Inspection")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, height - 34, width - 36, height - 34)

        # Running Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 40, width - 36, 40)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(36, 28, "DocuTrace Intelligent Document Verification System  •  Confidential Inspection Report")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(width - 36, 28, page_str)

        self.restoreState()


def safe_text(text: Optional[str]) -> str:
    """Escapes HTML/XML entities for ReportLab Paragraph rendering."""
    if not text:
        return ""
    return html.escape(str(text))


def highlight_sentence_text(sentence: Optional[str], substitutions: List[Dict[str, Any]], role: str, match_type: str) -> str:
    """
    Renders XML markup for ReportLab Paragraphs with visual highlighting for
    exact matches, substituted words, and modified terms.
    """
    if not sentence:
        return "<i>(No matching reference sentence found)</i>"

    escaped = html.escape(str(sentence))

    if match_type == "EXACT_MATCH":
        # Full green highlight for exact copy/duplicate sentence
        return f'<font backcolor="#d1fae5" color="#047857"><b>{escaped}</b></font>'

    if match_type in ["MODIFIED_TEXT", "PARTIAL_SIMILARITY"] and substitutions:
        # Highlight substituted words specifically
        for sub in substitutions:
            if role == "reference":
                target_word = sub.get("from_doc_a")
                if target_word and target_word in sentence:
                    esc_target = html.escape(target_word)
                    escaped = escaped.replace(
                        esc_target,
                        f'<font backcolor="#fee2e2" color="#991b1b"><b>{esc_target}</b></font>',
                        1
                    )
            elif role == "submitted":
                target_word = sub.get("to_doc_b")
                if target_word and target_word in sentence:
                    esc_target = html.escape(target_word)
                    escaped = escaped.replace(
                        esc_target,
                        f'<font backcolor="#fef08a" color="#854d0e"><b>{esc_target}</b></font>',
                        1
                    )
        return escaped

    return escaped


def generate_inspection_pdf(
    doc_a_name: str,
    doc_b_name: str,
    composite_similarity_percentage: float,
    classification: str,
    sentence_matches: List[Dict[str, Any]],
    generated_at: Optional[str] = None
) -> bytes:
    """
    Generates a PDF document buffer for the sentence-by-sentence plagiarism inspection.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=48
    )

    content_width = letter[0] - 72  # 612 - 72 = 540 pt
    timestamp = generated_at or time.strftime("%B %d, %Y at %I:%M %p")

    # Base stylesheet
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#64748b")
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=1  # Centered
    )
    label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569")
    )
    val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )
    section_h2 = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1e293b")
    )
    pair_header_style = ParagraphStyle(
        "PairHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1e3a5f")
    )
    sentence_label = ParagraphStyle(
        "SentLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#475569")
    )
    sentence_text = ParagraphStyle(
        "SentText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1e293b")
    )
    mutation_style = ParagraphStyle(
        "MutationText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#7c2d12")
    )

    story = []

    # 1. Header Banner
    header_table_data = [
        [
            Paragraph("<b>DocuTrace</b> &nbsp;<font color='#3b82f6' size='10'>VERIFICATION REPORT</font>", title_style),
            Paragraph(f"<font color='#64748b'>Generated: {safe_text(timestamp)}</font>", ParagraphStyle(
                "RightDate", parent=subtitle_style, alignment=2
            ))
        ],
        [
            Paragraph("Sentence-by-Sentence Plagiarism & Substitution Inspection", ParagraphStyle(
                "SubHeader", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#3b82f6")
            )),
            Paragraph("<font color='#64748b'>DocuTrace Intelligent Analysis</font>", ParagraphStyle(
                "RightSub", parent=subtitle_style, alignment=2
            ))
        ]
    ]
    header_table = Table(header_table_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=12))

    # Calculate counts
    total_sentences = len(sentence_matches)
    exact_count = sum(1 for sm in sentence_matches if sm.get("match_type") == "EXACT_MATCH")
    modified_count = sum(1 for sm in sentence_matches if sm.get("match_type") in ["MODIFIED_TEXT", "PARTIAL_SIMILARITY"])
    unique_count = sum(1 for sm in sentence_matches if sm.get("match_type") == "UNIQUE_CONTENT")

    # Score color & classification
    score = round(composite_similarity_percentage, 1)
    if score >= 80:
        score_color = "#dc2626"  # Rose/Red
        risk_label = "HIGH PLAGIARISM / DUPLICATE"
    elif score >= 50:
        score_color = "#d97706"  # Amber
        risk_label = "MODERATE SIMILARITY / PARAPHRASING"
    else:
        score_color = "#059669"  # Emerald
        risk_label = "LOW SIMILARITY / ORIGINAL CONTENT"

    # 2. Executive Summary Metrics Table
    summary_box_data = [
        [
            Paragraph("<b>Reference Document (A):</b>", label_style),
            Paragraph(safe_text(doc_a_name), val_style),
            Paragraph("<b>Overall Similarity:</b>", label_style),
            Paragraph(f"<font color='{score_color}' size='12'><b>{score}%</b></font>", val_style),
        ],
        [
            Paragraph("<b>Submitted Document (B):</b>", label_style),
            Paragraph(safe_text(doc_b_name), val_style),
            Paragraph("<b>Assessment:</b>", label_style),
            Paragraph(f"<font color='{score_color}'><b>{risk_label}</b></font>", val_style),
        ],
        [
            Paragraph("<b>Sentences Inspected:</b>", label_style),
            Paragraph(f"<b>{total_sentences}</b> sentences in Doc B", val_style),
            Paragraph("<b>Breakdown:</b>", label_style),
            Paragraph(
                f"<font color='#059669'><b>{exact_count}</b> Exact</font> &nbsp;|&nbsp; "
                f"<font color='#d97706'><b>{modified_count}</b> Paraphrased</font> &nbsp;|&nbsp; "
                f"<font color='#64748b'><b>{unique_count}</b> Unique</font>",
                val_style
            ),
        ]
    ]
    summary_table = Table(summary_box_data, colWidths=[130, 160, 100, 150])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 3. Legend Bar
    legend_data = [[
        Paragraph("<font color='#059669'>●</font> <b>Exact Match (100% Identical)</b>", ParagraphStyle("L1", parent=val_style, fontSize=8)),
        Paragraph("<font color='#d97706'>●</font> <b>Paraphrased / Substituted (Word changes)</b>", ParagraphStyle("L2", parent=val_style, fontSize=8)),
        Paragraph("<font color='#64748b'>●</font> <b>Unique Content (Original to Doc B)</b>", ParagraphStyle("L3", parent=val_style, fontSize=8)),
    ]]
    legend_table = Table(legend_data, colWidths=[180, 200, 160])
    legend_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(legend_table)
    story.append(Spacer(1, 12))

    # 4. Section Title
    story.append(Paragraph("Detailed Sentence Alignment & Modification Log", section_h2))
    story.append(Paragraph("Direct comparison of each sentence in the submitted document against its closest reference match.", subtitle_style))
    story.append(Spacer(1, 8))

    # 5. Sentence Pairs
    if not sentence_matches:
        story.append(Paragraph("<font color='#64748b'><i>No sentences available to display.</i></font>", val_style))
    else:
        for idx, sm in enumerate(sentence_matches, start=1):
            m_type = sm.get("match_type", "UNIQUE_CONTENT")
            sim_pct = sm.get("similarity_percentage", 0.0)

            # Colors and badges
            if m_type == "EXACT_MATCH":
                badge_bg = colors.HexColor("#ecfdf5")
                badge_border = colors.HexColor("#a7f3d0")
                badge_text_color = "#047857"
                badge_label = f"EXACT DUPLICATE ({sim_pct}%)"
                card_bg = colors.HexColor("#fafffa")
                card_border = colors.HexColor("#a7f3d0")
            elif m_type in ["MODIFIED_TEXT", "PARTIAL_SIMILARITY"]:
                badge_bg = colors.HexColor("#fffbeb")
                badge_border = colors.HexColor("#fde68a")
                badge_text_color = "#b45309"
                badge_label = f"PARAPHRASED / SUBSTITUTED ({sim_pct}%)"
                card_bg = colors.HexColor("#fffdf5")
                card_border = colors.HexColor("#fde68a")
            else:
                badge_bg = colors.HexColor("#f1f5f9")
                badge_border = colors.HexColor("#cbd5e1")
                badge_text_color = "#475569"
                badge_label = "UNIQUE CONTENT"
                card_bg = colors.HexColor("#f8fafc")
                card_border = colors.HexColor("#e2e8f0")

            # Left badge paragraph
            badge_html = f"<font color='{badge_text_color}'><b>{badge_label}</b></font>"
            header_cell_left = Paragraph(f"<b>Sentence #{idx}</b>", pair_header_style)
            header_cell_right = Paragraph(badge_html, ParagraphStyle("BText", parent=badge_style, alignment=2))

            top_row = Table([[header_cell_left, header_cell_right]], colWidths=[200, 320])
            top_row.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))

            doc_a_raw = sm.get("matched_doc_a_sentence")
            doc_b_raw = sm.get("doc_b_sentence") or ""

            diff_items = sm.get("diff_highlights", [])
            subs = [d for d in diff_items if d.get("type") == "substitution"]

            doc_a_highlighted = highlight_sentence_text(doc_a_raw, subs, "reference", m_type)
            doc_b_highlighted = highlight_sentence_text(doc_b_raw, subs, "submitted", m_type)

            # Comparison text table
            comp_rows = [
                [
                    Paragraph(f"<font color='#0284c7'><b>Reference ({safe_text(doc_a_name)}):</b></font>", sentence_label),
                ],
                [
                    Paragraph(doc_a_highlighted, sentence_text),
                ],
                [
                    Paragraph(f"<font color='#4f46e5'><b>Submitted ({safe_text(doc_b_name)}):</b></font>", sentence_label),
                ],
                [
                    Paragraph(doc_b_highlighted, sentence_text),
                ],
            ]

            # Word substitutions detected
            diff_items = sm.get("diff_highlights", [])
            subs = [d for d in diff_items if d.get("type") == "substitution"]
            if subs:
                subs_text = " &nbsp;|&nbsp; ".join([
                    f"<font color='#dc2626'><b>{safe_text(s.get('from_doc_a'))}</b></font> &rarr; <font color='#d97706'><b>{safe_text(s.get('to_doc_b'))}</b></font>"
                    for s in subs
                ])
                comp_rows.append([
                    Paragraph(f"<b>Word Substitutions Detected:</b> &nbsp; {subs_text}", mutation_style)
                ])

            inner_table = Table(comp_rows, colWidths=[520])
            inner_table.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))

            # Outer card container
            card_data = [
                [top_row],
                [HRFlowable(width="100%", thickness=0.5, color=badge_border, spaceBefore=2, spaceAfter=3)],
                [inner_table]
            ]
            card_table = Table(card_data, colWidths=[530])
            card_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), card_bg),
                ("BOX", (0, 0), (-1, -1), 1, card_border),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]))

            story.append(KeepTogether([card_table]))
            story.append(Spacer(1, 6))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
