const express = require('express');
const multer = require('multer'); /// image upload and image end points kosam
const https = require('https');
const fs = require('fs');

const jwt = require('jsonwebtoken'); // npm install jsonwebtoken
const supabase = require('./supabaseClient'); /// database connect supabase

const app = express();

app.use((req, res, next) => {
    res.setHeader('Bypass-Tunnel-Reminder', 'true');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // form-data support కోసం

app.use((req, res, next) => {
    console.log(`📌 ${req.method} ${req.path}`);
    console.log(`📌 Content-Type: ${req.headers['content-type']}`);
    console.log(`📌 Body:`, req.body);
    next();
});

const PORT = 3000;
const baseUrl = ' https://nodeserver-1-3zk7.onrender.com';

// ============================
// ✅ CONFIG
// ============================
const JWT_SECRET = process.env.JWT_SECRET || 'akhil_super_secret_key_change_this';
const JWT_EXPIRY = '7d';
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY || '67f7f8c7-7533-11f1-803e-0200cd936042';

// ✅ uploads folder లేకపోతే auto-create
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('uploads folder created ✅');
}

const localtunnel = require('localtunnel');

// ============================
// TOKEN VERIFY MIDDLEWARE (function definition matrame — apply chestam step 3 lo)
// ============================
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: false, message: 'Token Missing. Please Login Again.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, name, phone }
        next();
    } catch (e) {
        return res.status(401).json({ status: false, message: 'Invalid or Expired Token. Please Login Again.' });
    }
}

// ============================
// STEP 1: SEND OTP — [PUBLIC] mobile ki real OTP pampistundi
// ============================
app.post('/send-otp', async (req, res) => {
    try {
        const { mobile } = req.body || {};
        if (!mobile) {
            return res.status(400).json({ status: false, message: 'Mobile is required' });
        }

        // ✅ ee mobile number tho student database lo unnada check
        const { data: user, error } = await supabase
            .from('students')
            .select('id')
            .eq('phone', mobile)
            .single();

        if (error || !user) {
            return res.status(404).json({ status: false, message: 'User Not Found. Please Check Mobile Number.' });
        }

        const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${mobile}/AUTOGEN`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status === 'Success') {
            return res.status(200).json({
                status: true,
                message: 'OTP Sent Successfully',
                sessionId: data.Details // ✅ Flutter ee sessionId save chesukovali
            });
        } else {
            return res.status(500).json({ status: false, message: 'Failed to send OTP' });
        }
    } catch (e) {
        console.log('SEND OTP ERROR:', e.message);
        res.status(500).json({ status: false, message: 'Server Error' });
    }
});

// ============================
// STEP 2: LOGIN — [PUBLIC] mobile + otp + sessionId tho verify chesi token generate
// ============================
app.post('/login', async (req, res) => {
    try {
        const { mobile, otp, sessionId } = req.body || {};

        if (!mobile || !otp || !sessionId) {
            return res.status(400).json({ status: false, message: 'Mobile, OTP and SessionId are required' });
        }

        const verifyUrl = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`;
        const verifyResponse = await fetch(verifyUrl);
        const verifyData = await verifyResponse.json();

        if (verifyData.Status !== 'Success') {
            return res.status(401).json({ status: false, message: 'Invalid OTP' });
        }

        const { data: user, error } = await supabase
            .from('students')
            .select('*')
            .eq('phone', mobile)
            .single();

        if (error || !user) {
            return res.status(404).json({ status: false, message: 'User Not Found' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, phone: user.phone },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.setHeader('Authorization', `Bearer ${token}`); // header lo token

        return res.status(200).json({
            status: true,
            message: 'Login Success',
            token: token, // body lo kuda token
            user: {
                id: user.id, name: user.name, phone: user.phone,
                age: user.age, class: user.class, gender: user.gender, dept: user.dept
            }
        });
    } catch (e) {
        console.log('LOGIN ERROR:', e.message);
        res.status(500).json({ status: false, message: 'Server Error' });
    }
});

app.get('/home', (req, res) => {
    res.send('Welcome Home');
});

// ============================
// STEP 3: ఇక్కడ నుండి కింద unna routes అన్ని TOKEN REQUIRED
// IMPORTANT: /user routes kanna EE middleware ముందు ఉండాలి (mundu unna file lo ide bug undedi)
// ============================
const PUBLIC_PATHS = ['/login', '/home', '/send-otp'];

app.use((req, res, next) => {
    if (PUBLIC_PATHS.includes(req.path)) {
        return next();
    }
    verifyToken(req, res, next);
});

// ============================
// GET students (Supabase) — list all OR single by ?id=  [PROTECTED]
// ============================
app.get('/user', async (req, res) => {
    try {
        const id = req.query.id;

        if (id) {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                return res.status(404).json({ status: false, message: 'User Not Found' });
            }
            return res.json(data);
        }

        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.log('Supabase GET Error:', error.message);
            return res.status(500).json({ status: false, message: error.message });
        }

        console.log("Users Count:", data.length);
        res.json(data);
    } catch (e) {
        console.log('Error:', e);
        res.status(500).json({ status: false, message: 'Server Error' });
    }
});

// ============================
// POST — add a new student (Supabase insert)  [PROTECTED]
// ============================
app.post('/user', async (req, res) => {
    try {
        console.log("Body Data:", req.body);
        const name = req.body?.name;
        const age = req.body?.age;
        const phone = req.body?.phone;
        const studentClass = req.body?.class;
        const gender = req.body?.gender;
        const dept = req.body?.dept;

        if (!name || !phone) {
            return res.status(400).json({ status: false, message: 'Name and Phone are required' });
        }

        const insertData = {
            name: name,
            age: age ? Number(age) : null,
            phone: phone,
            gender: gender || null,
            dept: dept || null
        };
        insertData['class'] = studentClass || null;

        const { data, error } = await supabase
            .from('students')
            .insert([insertData])
            .select();

        if (error) {
            console.log('Supabase INSERT Error:', error.message);
            return res.status(500).json({ status: false, message: error.message });
        }

        res.status(201).json({
            status: true,
            message: 'Student Added Successfully',
            data: data[0]
        });
    } catch (e) {
        console.log('CATCH Error:', e);
        res.status(500).json({ status: false, message: 'Server Error' });
    }
});

app.post('/fooditems', (req, res) => {

});

// Multer Configuration (future image upload kosam)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ✅ Error handler — ALWAYS routes tarvata, chivarilo pettali (4 params unte matrame Express handler ani gurthistundi)
app.use((err, req, res, next) => {
    console.error('EXPRESS ERROR:', err);
    res.status(500).json({ status: false, message: err.message });
});

app.listen(PORT, () => {
    console.log(`Tunnel URL: ${baseUrl}`);
    https.get('https://ipv4.icanhazip.com', (res) => {
        let ip = '';
        res.on('data', (chunk) => ip += chunk);
        res.on('end', () => {
            console.log(`Browser asks IP? Enter: ${ip.trim()}`);
        });
    }).on('error', () => {
        console.log('IP fetch failed — manually check IP from browser warning page');
    });
});