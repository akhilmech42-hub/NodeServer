const express = require('express');
const multer = require('multer'); /// image upload and image end points kosam
const https = require('https');
const fs = require('fs');

const jwt = require('jsonwebtoken'); // npm install jsonwebtoken
const supabase = require('./supabaseClient'); /// database connect supabase

const app = express();

/// token generated
const JWT_SECRET = process.env.JWT_SECRET || 'akhil_super_secret_key_change_this';
const JWT_EXPIRY = '7d';
const DEFAULT_OTP = '1234'; // testing kosam fixed OTP

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

app.use((err, req, res, next) => {
    console.error('EXPRESS ERROR:', err);
    res.status(500).json({
        status: false,
        message: err.message
    });
});

app.use((req, res, next) => {
    res.setHeader('Bypass-Tunnel-Reminder', 'true');
    next();
});
 
//root
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // form-data support కోసం


const PORT = 3000;
const baseUrl=' https://nodeserver-1-3zk7.onrender.com';

// ✅ uploads folder లేకపోతే auto-create
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('uploads folder created ✅');
}

const localtunnel = require('localtunnel');


// ============================
// GET students (Supabase) — list all OR single by ?id=
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
                return res.status(404).json({
                    status: false,
                    message: 'User Not Found'
                });
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
// POST — add a new student (Supabase insert)
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
            return res.status(400).json({
                status: false,
                message: 'Name and Phone are required'
            });
        }

        const insertData = {
            name: name,
            age: age ? Number(age) : null,
            phone: phone,
            gender: gender || null,
            dept: dept || null
        };
        insertData['class'] = studentClass || null;

        console.log("Insert Data:", insertData); // ← add చేయండి

        const { data, error } = await supabase
            .from('students')
            .insert([insertData])
            .select();

        if (error) {
            console.log('Supabase INSERT Error:', error.message);
            console.log('Supabase INSERT Error details:', error); // ← add చేయండి
            return res.status(500).json({ status: false, message: error.message });
        }

        res.status(201).json({
            status: true,
            message: 'Student Added Successfully',
            data: data[0]
        });
    } catch (e) {
        console.log('CATCH Error:', e); // ← add చేయండి
        res.status(500).json({ status: false, message: 'Server Error' });
    }
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ఇక్కడ add చేయండి — ఈ రెండు lines తర్వాత
app.use((req, res, next) => {
    console.log(`📌 ${req.method} ${req.path}`);
    console.log(`📌 Content-Type: ${req.headers['content-type']}`);
    console.log(`📌 Body:`, req.body);
    next();
});
 




// Multer Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get('/home', (req, res) => {
    res.send('Welcome Home');
});

// app.get('/user', (req, res) => {
     
    
//     const users=[
//         {
//         id:1,
//         status: true,
//         name: 'Akhil',
//         mobile: '9876543210',
//         age: '24'
//     },
//         {
//         id:2,    
//         status: true,
//         name: 'sai',
//         mobile: '9876543210',
//         age: '21'
//     },
//     {
//         id:3,
//         status: false,
//         name: 'ammulu',
//         mobile: '8768459231',
//         age: '15'
//     },
//     {
//         id: 4,
//         status: false,
//         name: 'aavanthika',
//         mobile: '9876534232',
//         age: '13'
//     },
//     {
//         id: 5,
//         status: true,
//         name: 'bala ankammarao',
//         mobile: '47653247892',
//         age: '8'
//     }
//     ];

//     console.log("Users Count:", users.length);
//      const id = req.query.id;
//       if (!id) {
//         return res.json(users);
//     }
//      const user = users.find(u => u.id === parseInt(id));

//        if (!user) {
//         return res.status(404).json({
//             status: false,
//             message: 'User Not Found'
//         });
//     }
//     res.json(user);
// });

/// these is only default number and default otp using by login
// app.post('/login', (req, res) =>{
//     console.log("Headers:", req.headers['content-type']); // ✅ Debug line
//     console.log("Body Data:", req.body); 
//     const { mobile, password } = req.body || {};
//       if (!mobile || !password) {
//         return res.status(400).json({
//             status: false,
//             message: 'Mobile and Password are required'
//         });
//     }
    
//   if (
//         mobile === '9876543210' &&
//         password === '1234'
//     ) {
//         return res.status(200).json({
//             status: true,
//             message: 'Login Success'
//         });
//     }

//     return res.status(401).json({
//         status: false,
//         message: 'Invalid Credentials'
//     });
      
// });

app.post('/login', async (req, res) => {
    try {
        const { mobile, otp } = req.body || {};

        if (!mobile || !otp) {
            return res.status(400).json({ status: false, message: 'Mobile and OTP are required' });
        }

        if (otp !== DEFAULT_OTP) {
            return res.status(401).json({ status: false, message: 'Invalid OTP' });
        }

        const { data: user, error } = await supabase
            .from('students')
            .select('*')
            .eq('phone', mobile)
            .single();

        if (error || !user) {
            return res.status(404).json({ status: false, message: 'User Not Found. Please Check Mobile Number.' });
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
            token: token, // body lo kuda token (Flutter easy ga chadavataniki)
            user: {
                id: user.id, name: user.name, phone: user.phone,
                age: user.age, class: user.class, gender: user.gender, dept: user.dept
            }
        });
    } catch (e) {
        console.log('LOGIN ERROR:', e);
        res.status(500).json({ status: false, message: 'Server Error' });
    }
});

const PUBLIC_PATHS = ['/login', '/home'];

app.use((req, res, next) => {
    if (PUBLIC_PATHS.includes(req.path)) {
        return next();
    }
    verifyToken(req, res, next);
});

app.post('/fooditems',(req, res) =>{
    
});

//image upload
// app.post('/upload',upload.single('image'),(req, res) =>{
//     console.log("========== HEADERS ==========");
//     console.log(req.headers);
//     console.log("========== BODY ==========");
//     console.log(req.body);
//      console.log("========== FILE ==========");
//     console.log(req.file);
    
//  if (!req.file) {
//         return res.status(400).json({
//             status: false,
//             message: 'Please select an image'
//         });
//     }
//      res.status(200).json({
//         status: true,
//         message: 'Image Uploaded Successfully',
//         fileName: req.file.filename,
//         path: req.file.path
//     });
// })

app.listen(PORT, () => {
    //console.log(`Server running on http://localhost:${PORT}`);
    // console.log(`Home API: http://localhost:${PORT}/home`);
    // console.log(`User GET API:http://localhost:${PORT}/user`);
    //  console.log(`User POST API:http://localhost:${PORT}/login`);
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