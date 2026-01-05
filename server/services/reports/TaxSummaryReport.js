import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Tax Summary Report Generator
 * Generates IRS Schedule C optimized tax reports with line numbers
 */
export class TaxSummaryReport extends BaseReportGenerator {
  
  async generate(reportData, options = {}) {
    const {
      userId = 'user',
      includeTransactionDetails = false
    } = options;

    const taxYear = reportData.taxYear || new Date().getFullYear();
    const fileName = `schedule-c-tax-summary-${taxYear}-${userId}-${Date.now()}.pdf`;
    const title = `IRS Schedule C Tax Summary - ${taxYear}`;

    // Format date range for display
    let dateRangeStr = null;
    if (reportData.period && reportData.period.startDate && reportData.period.endDate) {
      const startDate = new Date(reportData.period.startDate).toLocaleDateString();
      const endDate = new Date(reportData.period.endDate).toLocaleDateString();
      dateRangeStr = `${startDate} to ${endDate}`;
    }

    return this.generatePDF({
      fileName,
      title,
      dateRange: dateRangeStr,
      reportData,
      includeTransactionDetails
    });
  }

  addReportContent(doc, transactions, summary, options = {}) {
    const { reportData, includeTransactionDetails } = options;
    
    if (!reportData) {
      doc.text('No report data available');
      return;
    }

    // Add summary section
    this.addSummarySection(doc, reportData.summary);

    // Add Schedule C breakdown by line
    this.addScheduleCSection(doc, reportData.scheduleC);

    // Add labor payments section (contractors and wages)
    if (reportData.laborPayments) {
      this.addLaborPaymentsSection(doc, reportData.laborPayments);
    }

    // Add special reporting requirements
    if (reportData.specialReporting && reportData.specialReporting.length > 0) {
      this.addSpecialReportingSection(doc, reportData.specialReporting);
    }
  }

  addSummarySection(doc, summary) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Tax Year Summary', { underline: true });

    doc.moveDown(0.5);

    const summaryItems = [
      { label: 'Total Deductible Expenses', value: `$${(summary.totalDeductibleExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Total Transactions', value: summary.totalTransactions || 0 },
      { label: 'Total Contractor Payments (Line 11)', value: `$${(summary.totalContractorPayments || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Total Wage Payments (Line 26)', value: `$${(summary.totalWagePayments || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Contractors Requiring 1099-NEC', value: summary.contractorsRequiring1099 || 0 }
    ];

    summaryItems.forEach(item => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(item.label + ':', 50, doc.y, { continued: true, width: 250 });
      doc.font('Helvetica-Bold')
         .text(String(item.value), { align: 'right' });
    });

    // Quarterly breakdown
    if (summary.quarterlyBreakdown) {
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Quarterly Breakdown:');
      
      doc.moveDown(0.3);
      Object.entries(summary.quarterlyBreakdown).forEach(([quarter, amount]) => {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`${quarter}:`, 70, doc.y, { continued: true, width: 200 });
        doc.font('Helvetica-Bold')
           .text(`$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { align: 'right' });
      });
    }

    doc.moveDown(1);
  }

  addScheduleCSection(doc, scheduleC) {
    this.checkPageBreak(doc, 100);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Schedule C Expense Categories by Line', { underline: true });

    doc.moveDown(0.5);

    if (!scheduleC || scheduleC.length === 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('No deductible expenses recorded.');
      doc.moveDown(1);
      return;
    }

    scheduleC.forEach(lineGroup => {
      this.checkPageBreak(doc, 60);

      // Line header
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1E40AF')
         .text(`Line ${lineGroup.line}`, 50, doc.y);
      
      doc.fillColor('black');

      // Categories under this line
      lineGroup.categories.forEach(category => {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`  ${category.category}`, 60, doc.y, { continued: true, width: 320 });
        
        doc.font('Helvetica-Bold')
           .fillColor('#DC2626')
           .text(`$${category.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { align: 'right' });
        
        doc.fillColor('#6B7280')
           .font('Helvetica')
           .fontSize(9)
           .text(`    (${category.transactionCount} transactions)`, 60);
        
        doc.fillColor('black');
      });

      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  addLaborPaymentsSection(doc, laborPayments) {
    this.checkPageBreak(doc, 150);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Labor Payments Detail', { underline: true });

    doc.moveDown(0.5);

    // Contractors (Line 11)
    if (laborPayments.contractors && laborPayments.contractors.payees.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#7C3AED')
         .text(`Line ${laborPayments.contractors.line} - ${laborPayments.contractors.lineDescription}`);
      
      doc.fillColor('black')
         .fontSize(9)
         .font('Helvetica-Oblique')
         .text(laborPayments.contractors.note);
      
      doc.moveDown(0.3);

      // Table header
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('Contractor/Payee', 60, doc.y, { continued: true, width: 200 });
      doc.text('Amount', 280, doc.y, { continued: true, width: 100, align: 'right' });
      doc.text('1099 Required', { width: 80, align: 'center' });

      doc.moveDown(0.2);
      doc.moveTo(60, doc.y).lineTo(520, doc.y).stroke();
      doc.moveDown(0.2);

      laborPayments.contractors.payees.forEach(payee => {
        this.checkPageBreak(doc, 20);
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(payee.payee, 60, doc.y, { continued: true, width: 200 });
        doc.text(`$${payee.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 280, doc.y, { continued: true, width: 100, align: 'right' });
        
        if (payee.requires1099) {
          doc.fillColor('#DC2626')
             .font('Helvetica-Bold')
             .text('YES', { width: 80, align: 'center' });
          doc.fillColor('black');
        } else {
          doc.fillColor('#059669')
             .text('No', { width: 80, align: 'center' });
          doc.fillColor('black');
        }
      });

      doc.moveDown(0.3);
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`Total Contract Labor: $${laborPayments.contractors.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 60);
      
      doc.moveDown(0.8);
    }

    // Wages (Line 26)
    if (laborPayments.wages && laborPayments.wages.payees.length > 0) {
      this.checkPageBreak(doc, 100);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#0891B2')
         .text(`Line ${laborPayments.wages.line} - ${laborPayments.wages.lineDescription}`);
      
      doc.fillColor('black')
         .fontSize(9)
         .font('Helvetica-Oblique')
         .text(laborPayments.wages.note);
      
      doc.moveDown(0.3);

      // Table header
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('Employee', 60, doc.y, { continued: true, width: 200 });
      doc.text('Wages Paid', 280, doc.y, { continued: true, width: 100, align: 'right' });
      doc.text('# Payments', { width: 80, align: 'center' });

      doc.moveDown(0.2);
      doc.moveTo(60, doc.y).lineTo(520, doc.y).stroke();
      doc.moveDown(0.2);

      laborPayments.wages.payees.forEach(payee => {
        this.checkPageBreak(doc, 20);
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(payee.payee, 60, doc.y, { continued: true, width: 200 });
        doc.text(`$${payee.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 280, doc.y, { continued: true, width: 100, align: 'right' });
        doc.text(String(payee.transactionCount), { width: 80, align: 'center' });
      });

      doc.moveDown(0.3);
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`Total Wages: $${laborPayments.wages.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 60);
      
      doc.moveDown(0.8);
    }
  }

  addSpecialReportingSection(doc, specialReporting) {
    this.checkPageBreak(doc, 100);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#B45309')
       .text('⚠ Special Reporting Requirements', { underline: true });
    
    doc.fillColor('black');
    doc.moveDown(0.5);

    doc.fontSize(9)
       .font('Helvetica-Oblique')
       .text('The following categories have additional IRS reporting requirements:');
    
    doc.moveDown(0.3);

    specialReporting.forEach(item => {
      this.checkPageBreak(doc, 40);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`Line ${item.line} - ${item.category}`, 60);
      
      doc.fontSize(9)
         .font('Helvetica')
         .text(`Amount: $${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 70);
      
      doc.fillColor('#B45309')
         .font('Helvetica-Oblique')
         .text(`Requirement: ${item.requirement}`, 70);
      
      doc.fillColor('black');
      doc.moveDown(0.4);
    });
  }
}

export default TaxSummaryReport;
