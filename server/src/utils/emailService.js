import nodemailer from 'nodemailer';

/**
 * Create email transporter based on environment configuration
 */
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });
};

/**
 * Generate HTML email template for Purchase Order
 */
const generatePOEmailHTML = (purchaseOrder, vendor) => {
  const items = purchaseOrder.items || [];
  const totalAmount = purchaseOrder.total_amount || 0;
  const poDate = new Date(purchaseOrder.po_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsHTML = items.map((item, index) => {
    const material = item.material || {};
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const total = quantity * unitPrice;
    
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${material.material_name || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${material.product_code || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.uom || 'PIECE(S)'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${parseFloat(unitPrice).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${parseFloat(total).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order ${purchaseOrder.po_number}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Purchase Order</h1>
        <p style="margin: 5px 0;"><strong>PO Number:</strong> ${purchaseOrder.po_number}</p>
        <p style="margin: 5px 0;"><strong>PO Date:</strong> ${poDate}</p>
        ${purchaseOrder.purchaseRequest ? `<p style="margin: 5px 0;"><strong>PR Number:</strong> ${purchaseOrder.purchaseRequest.pr_number || 'N/A'}</p>` : ''}
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Vendor Information</h2>
        <p><strong>Name:</strong> ${vendor.partner_name || 'N/A'}</p>
        <p><strong>Contact:</strong> ${vendor.contact_first_name || ''} ${vendor.contact_last_name || ''}</p>
        <p><strong>Email:</strong> ${vendor.contact_email || vendor.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${vendor.contact_phone || vendor.phone || 'N/A'}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #3498db; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">#</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Material Name</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Product Code</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">UOM</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Unit Price</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td colspan="6" style="padding: 12px; text-align: right; border: 1px solid #ddd;">Grand Total:</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">₹${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${purchaseOrder.remarks ? `
      <div style="margin-bottom: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Remarks</h2>
        <p style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">${purchaseOrder.remarks}</p>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding: 20px; background-color: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
        <p style="margin: 0;"><strong>Please acknowledge receipt of this Purchase Order.</strong></p>
        <p style="margin: 10px 0 0 0;">If you have any questions or concerns, please contact us immediately.</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send Purchase Order email to vendor
 */
export const sendPOEmailToVendor = async (purchaseOrder, vendorEmail, vendor) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn('⚠️  Email service not configured. Skipping email send.');
      // In development, log the email content
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent to:', vendorEmail);
        console.log('📄 PO Number:', purchaseOrder.po_number);
      }
      return { success: false, message: 'Email service not configured' };
    }

    const emailHTML = generatePOEmailHTML(purchaseOrder, vendor);
    const emailText = `
Purchase Order ${purchaseOrder.po_number}

Date: ${new Date(purchaseOrder.po_date).toLocaleDateString()}
Vendor: ${vendor?.partner_name || 'N/A'}

Items:
${(purchaseOrder.items || []).map((item, i) => 
  `${i + 1}. ${item.material?.material_name || 'N/A'} - Qty: ${item.quantity} - Price: ₹${item.unit_price || 0}`
).join('\n')}

Total Amount: ₹${purchaseOrder.total_amount || 0}

${purchaseOrder.remarks ? `Remarks: ${purchaseOrder.remarks}` : ''}

Please acknowledge receipt of this Purchase Order.
    `.trim();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Purchase Order System'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: vendorEmail,
      cc: process.env.SMTP_CC_EMAIL || undefined,
      bcc: process.env.SMTP_BCC_EMAIL || undefined,
      subject: `Purchase Order ${purchaseOrder.po_number} - ${vendor?.partner_name || 'Order'}`,
      text: emailText,
      html: emailHTML,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Purchase Order email sent successfully');
    console.log('   To:', vendorEmail);
    console.log('   Message ID:', info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('❌ Error sending Purchase Order email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Check if email service is configured
 */
export const isEmailConfigured = () => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async () => {
  const transporter = createTransporter();
  if (!transporter) {
    return { configured: false, message: 'Email service not configured' };
  }

  try {
    await transporter.verify();
    return { configured: true, message: 'Email service is ready' };
  } catch (error) {
    return { configured: false, message: `Email service verification failed: ${error.message}` };
  }
};
