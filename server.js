const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONTACT INFO - AHMED MAGDY ====================
const CONTACT = {
    name: 'Ahmed Magdy',
    whatsapp: '+201000414576',
    telegram: '@axvman',
    instagram: 'axvman',
    linkedin: 'https://www.linkedin.com/in/axvman',
    facebook: 'https://www.facebook.com/ahmed.magdy.813088',
    email: 'ellmdy2005@gmail.com',
    vodafoneCash: '01000414576',
    meezaCard: '5078035060801802',
    bankName: 'البنك الأهلي المصري'
};

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== EMAIL CONFIG ====================
// Gmail App Password from environment variable
const EMAIL_PASS = process.env.EMAIL_PASS || '';

const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'ellmdy2005@gmail.com',
        pass: EMAIL_PASS
    }
});

// Verify email connection on startup
transporter.verify(function(error, success) {
    if (error) {
        console.log('⚠️ Email connection error:', error.message);
        console.log('💡 Make sure EMAIL_PASS is set correctly');
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// ==================== DATA STORAGE ====================
const DATA_FILE = './orders.json';

function loadOrders() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return [];
}

function saveOrders(orders) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        emailConfigured: EMAIL_PASS.length > 0
    });
});

// Get contact info
app.get('/api/contact', (req, res) => {
    res.json({
        success: true,
        data: {
            name: CONTACT.name,
            whatsapp: CONTACT.whatsapp,
            telegram: CONTACT.telegram,
            instagram: CONTACT.instagram,
            linkedin: CONTACT.linkedin,
            facebook: CONTACT.facebook,
            email: CONTACT.email
        }
    });
});

// Get payment info
app.get('/api/payment-info', (req, res) => {
    res.json({
        success: true,
        data: {
            methods: [
                {
                    id: 'vodafone_cash',
                    name: 'فودافون كاش',
                    number: CONTACT.vodafoneCash,
                    instructions: [
                        'افتح تطبيق فودافون كاش',
                        'اختر "تحويل"',
                        'أدخل الرقم: ' + CONTACT.vodafoneCash,
                        'أدخل المبلغ',
                        'أكد التحويل',
                        'احتفظ بإيصال التحويل'
                    ]
                },
                {
                    id: 'meeza_card',
                    name: 'ميزة - البنك الأهلي',
                    number: CONTACT.meezaCard,
                    bankName: CONTACT.bankName,
                    instructions: [
                        'اذهب لأقرب فرع بنك أهلي',
                        'اطلب تحويل على رقم ميزة',
                        'الرقم: ' + CONTACT.meezaCard,
                        'احتفظ بإيصال التحويل'
                    ]
                }
            ]
        }
    });
});

// Submit new order
app.post('/api/order', async (req, res) => {
    try {
        const {
            service,
            serviceKey,
            method,
            description,
            delivery,
            deliveryContact,
            deadline,
            quantity,
            basePrice,
            finalPrice,
            customerName,
            customerEmail,
            customerPhone,
            paymentMethod
        } = req.body;

        if (!service || !description || !delivery || !customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'بيانات ناقصة. الرجاء ملء جميع الحقول المطلوبة'
            });
        }

        const orderId = 'TM-' + Date.now().toString(36).toUpperCase();
        const order = {
            id: orderId,
            service,
            serviceKey: serviceKey || '',
            method: method || 'manual',
            description,
            delivery,
            deliveryContact: deliveryContact || '',
            deadline: deadline || 'standard',
            quantity: quantity || 1,
            basePrice: basePrice || 0,
            finalPrice: finalPrice || 0,
            customerName,
            customerEmail: customerEmail || '',
            customerPhone,
            paymentMethod: paymentMethod || 'vodafone_cash',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const orders = loadOrders();
        orders.push(order);
        saveOrders(orders);

        // Send email to Ahmed
        const emailSubject = `طلب جديد #${orderId} - ${service}`;
        const emailBody = `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #f8f9fa; padding: 30px; border-radius: 20px; border: 1px solid #2a2a4a;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #e6b325; margin: 0; font-size: 28px;">⚡ TaskMalty</h1>
                <p style="color: #adb5bd; margin-top: 10px;">طلب جديد واصل يا Ahmed!</p>
            </div>

            <div style="background: rgba(230,179,37,0.1); border: 1px solid rgba(230,179,37,0.3); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #e6b325; margin: 0 0 15px 0; font-size: 20px;">📋 تفاصيل الطلب</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #adb5bd; width: 40%;">رقم الطلب:</td><td style="padding: 8px 0; font-weight: bold; color: #e6b325;">${orderId}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">الخدمة:</td><td style="padding: 8px 0; font-weight: bold;">${service}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">طريقة التنفيذ:</td><td style="padding: 8px 0;">${method === 'ai' ? 'مدعوم بالذكاء الاصطناعي' : method === 'mixed' ? 'مختلط' : 'يدوي'}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">الكمية:</td><td style="padding: 8px 0;">${quantity || 1}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">المبلغ:</td><td style="padding: 8px 0; font-weight: bold; color: #e6b325; font-size: 18px;">$${finalPrice || 0}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">مدة التسليم:</td><td style="padding: 8px 0;">${deadline || 'عادي'}</td></tr>
                </table>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid #2a2a4a; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #e6b325; margin: 0 0 15px 0; font-size: 18px;">👤 بيانات العميل</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #adb5bd; width: 40%;">الاسم:</td><td style="padding: 8px 0; font-weight: bold;">${customerName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">البريد:</td><td style="padding: 8px 0;">${customerEmail || 'غير متوفر'}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">الهاتف:</td><td style="padding: 8px 0; font-weight: bold; direction: ltr; text-align: right;">${customerPhone}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">طريقة التواصل:</td><td style="padding: 8px 0;">${delivery}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">بيانات التواصل:</td><td style="padding: 8px 0; direction: ltr; text-align: right;">${deliveryContact || 'غير متوفر'}</td></tr>
                </table>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid #2a2a4a; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #e6b325; margin: 0 0 15px 0; font-size: 18px;">📝 وصف الطلب</h3>
                <p style="line-height: 1.8; margin: 0; white-space: pre-wrap;">${description}</p>
            </div>

            <div style="background: rgba(40,167,69,0.1); border: 1px solid rgba(40,167,69,0.3); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px;">💳 معلومات الدفع</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #adb5bd; width: 40%;">طريقة الدفع:</td><td style="padding: 8px 0; font-weight: bold;">${paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'ميزة - البنك الأهلي'}</td></tr>
                    <tr><td style="padding: 8px 0; color: #adb5bd;">حالة الدفع:</td><td style="padding: 8px 0; color: #ffc107; font-weight: bold;">⏳ بانتظار التأكيد</td></tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #2a2a4a;">
                <p style="color: #adb5bd; font-size: 14px;">TaskMalty - Ahmed Magdy</p>
                <p style="color: #adb5bd; font-size: 12px; margin-top: 10px;">تم استلام هذا الطلب في ${new Date().toLocaleString('ar-EG')}</p>
            </div>
        </div>
        `;

        await transporter.sendMail({
            from: '"TaskMalty Orders" <ellmdy2005@gmail.com>',
            to: 'ellmdy2005@gmail.com',
            subject: emailSubject,
            html: emailBody
        });

        // Send confirmation to customer
        if (customerEmail) {
            const customerEmailBody = `
            <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #f8f9fa; padding: 30px; border-radius: 20px; border: 1px solid #2a2a4a;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #e6b325; margin: 0; font-size: 28px;">⚡ TaskMalty</h1>
                </div>

                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 70px; height: 70px; background: #28a745; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                        <span style="color: white; font-size: 32px;">✓</span>
                    </div>
                    <h2 style="color: #28a745; margin: 0;">تم استلام طلبك بنجاح!</h2>
                </div>

                <div style="background: rgba(230,179,37,0.1); border: 1px solid rgba(230,179,37,0.3); border-radius: 14px; padding: 20px; margin-bottom: 20px; text-align: center;">
                    <p style="color: #adb5bd; margin: 0 0 10px 0;">رقم الطلب</p>
                    <p style="color: #e6b325; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace;">${orderId}</p>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid #2a2a4a; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #e6b325; margin: 0 0 15px 0;">📋 ملخص الطلب</h3>
                    <p><strong>الخدمة:</strong> ${service}</p>
                    <p><strong>المبلغ:</strong> <span style="color: #e6b325; font-weight: bold;">$${finalPrice || 0}</span></p>
                </div>

                <div style="background: rgba(23,162,184,0.1); border: 1px solid rgba(23,162,184,0.3); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #17a2b8; margin: 0 0 15px 0;">💳 خطوات الدفع</h3>
                    <p style="margin: 0 0 10px 0;">1. حول المبلغ على فودافون كاش:</p>
                    <p style="color: #e6b325; font-weight: bold; direction: ltr; text-align: center; font-size: 20px; margin: 10px 0;">${CONTACT.vodafoneCash}</p>
                    <p style="margin: 0 0 10px 0;">2. أرسل إيصال التحويل على واتساب:</p>
                    <p style="color: #e6b325; font-weight: bold; direction: ltr; text-align: center; font-size: 18px; margin: 10px 0;">${CONTACT.whatsapp}</p>
                    <p style="margin: 0; color: #adb5bd; font-size: 14px;">سنبدأ في تنفيذ طلبك فور تأكيد الدفع</p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #adb5bd; font-size: 14px;">شكرا لثقتك بـ TaskMalty!</p>
                    <p style="color: #adb5bd; font-size: 12px;">Ahmed Magdy - ellmdy2005@gmail.com</p>
                </div>
            </div>
            `;

            await transporter.sendMail({
                from: '"TaskMalty" <ellmdy2005@gmail.com>',
                to: customerEmail,
                subject: 'تم استلام طلبك - TaskMalty #' + orderId,
                html: customerEmailBody
            });
        }

        res.json({
            success: true,
            message: 'تم استلام الطلب بنجاح',
            orderId: orderId,
            paymentInfo: {
                method: 'vodafone_cash',
                number: CONTACT.vodafoneCash,
                instructions: 'حول المبلغ على فودافون كاش ثم أرسل الإيصال على واتساب'
            }
        });

    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى.'
        });
    }
});

// Upload payment proof
app.post('/api/payment-proof', (req, res) => {
    try {
        const { orderId, proofImage, notes } = req.body;

        if (!orderId || !proofImage) {
            return res.status(400).json({ success: false, message: 'بيانات ناقصة' });
        }

        const proofDir = './proofs';
        if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir);

        const base64Data = proofImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const proofPath = `${proofDir}/${orderId}_${Date.now()}.png`;
        fs.writeFileSync(proofPath, buffer);

        const orders = loadOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].paymentProof = proofPath;
            orders[orderIndex].paymentNotes = notes || '';
            orders[orderIndex].status = 'proof_submitted';
            orders[orderIndex].updatedAt = new Date().toISOString();
            saveOrders(orders);
        }

        res.json({ success: true, message: 'تم استلام إثبات الدفع' });
    } catch (error) {
        console.error('Payment proof error:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ' });
    }
});

// Get all orders
app.get('/api/orders', (req, res) => {
    const orders = loadOrders();
    res.json({ success: true, count: orders.length, data: orders });
});

// Get single order
app.get('/api/orders/:id', (req, res) => {
    const orders = loadOrders();
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
        return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    res.json({ success: true, data: order });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const orders = loadOrders();
    const orderIndex = orders.findIndex(o => o.id === req.params.id);

    if (orderIndex === -1) {
        return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    saveOrders(orders);

    res.json({ success: true, message: 'تم تحديث الحالة' });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log('🚀 TaskMalty Backend running on port ' + PORT);
    console.log('👤 Owner: Ahmed Magdy');
    console.log('📧 Email: ellmdy2005@gmail.com');
    console.log('💳 Vodafone Cash: ' + CONTACT.vodafoneCash);
    console.log('💳 Meeza Card: ' + CONTACT.meezaCard);
    console.log('');
    console.log('📧 Email Status: ' + (EMAIL_PASS ? '✅ Configured' : '❌ Not configured - set EMAIL_PASS environment variable'));
});
