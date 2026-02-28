const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const multer = require('multer'); 
const app = express();

// --- RASM YUKLASH SOZLAMALARI ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'file-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 1. ASOSIY SOZLAMALAR
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));d
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Sessiya sozlamalari
app.use(session({
    secret: 'innovathub-2025-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 2. MA'LUMOTLAR BILAN ISHLASH
const getData = (file) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
        return [];
    }
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.trim() ? JSON.parse(data) : [];
    } catch (e) { return []; }
};

const saveData = (file, data) => {
    const filePath = path.join(__dirname, file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Admin himoyasi middleware
const isAdmin = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/login');
};

// 3. SAHIFA YO'NALISHLARI
app.get('/', (req, res) => res.render('index', { isLoggedIn: req.session.isLoggedIn || false }));

app.get('/products', (req, res) => {
    const products = getData('products.json');
    res.render('products', { products, isLoggedIn: req.session.isLoggedIn || false });
});

app.get('/startups', (req, res) => {
    const startups = getData('startups.json');
    res.render('startups', { startups, isLoggedIn: req.session.isLoggedIn || false });
});

app.get('/patents', (req, res) => {
    const patents = getData('patents.json');
    res.render('patents', { patents, isLoggedIn: req.session.isLoggedIn || false });
});

app.get('/investors', (req, res) => res.render('investors', { isLoggedIn: req.session.isLoggedIn || false }));

// --- KONTAKTLAR YO'NALISHI (YANGILANDI) ---
app.get('/contact', (req, res) => {
    const contacts = getData('contacts.json');
    // Agar baza bo'sh bo'lsa, standart ma'lumotlar
    const defaultData = { 
        phone: "+998 71 237-19-45", 
        telegram: "InnovatHubBot", 
        email: "info@tiiame.uz" 
    };
    res.render('contact', { 
        contacts: contacts.length > 0 ? contacts[0] : defaultData, 
        isLoggedIn: req.session.isLoggedIn || false 
    });
});

// 4. ADMIN: MA'LUMOT QO'SHISH
app.post('/admin/add-item', isAdmin, upload.single('image'), (req, res) => {
    const { type, title, description, goal, status } = req.body;
    
    if (!type) return res.send("Xato: Tur (type) tanlanmagan!");

    const fileName = type + 's.json'; 
    let data = getData(fileName);
    
    const newItem = {
        id: Date.now().toString(),
        title: title || "Nomsiz",
        description: description || "",
        image: req.file ? '/uploads/' + req.file.filename : '/images/bino.jpeg',
        goal: goal || "0",
        collected: "0",
        status: status || "Yangi"
    };

    data.push(newItem);
    saveData(fileName, data);
    
    req.session.save(() => {
        res.redirect('/' + type + 's');
    });
});

// --- ADMIN: KONTAKTLARNI TAHRIRLASH (YANGI) ---
app.post('/admin/update-contacts', isAdmin, (req, res) => {
    const { phone, telegram, email } = req.body;
    saveData('contacts.json', [{ phone, telegram, email }]);
    res.redirect('/contact');
});

// 5. ADMIN: MA'LUMOTNI O'CHIRISH
app.post('/admin/delete/product/:id', isAdmin, (req, res) => {
    let data = getData('products.json');
    saveData('products.json', data.filter(i => String(i.id) !== String(req.params.id)));
    res.redirect('/products');
});

app.post('/admin/delete/startup/:id', isAdmin, (req, res) => {
    let data = getData('startups.json');
    saveData('startups.json', data.filter(i => String(i.id) !== String(req.params.id)));
    res.redirect('/startups');
});

app.post('/admin/delete/patent/:id', isAdmin, (req, res) => {
    let data = getData('patents.json');
    saveData('patents.json', data.filter(i => String(i.id) !== String(req.params.id)));
    res.redirect('/patents');
});

// 6. LOGIN / LOGOUT
app.get('/login', (req, res) => res.render('register'));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        req.session.isLoggedIn = true;
        req.session.save(() => res.redirect('/')); 
    } else {
        res.send("<h1>Xato!</h1><a href='/login'>Qaytish</a>");
    }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`));