const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const serverless = require('serverless-http');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_CONNECTION_STRING = process.env.MONGO_URI;

mongoose.connect(DB_CONNECTION_STRING)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

const participantsSchema = new mongoose.Schema({
    nama: { type: String, required: true },
    blok_rumah: { type: String, required: true },
    nohp: { type: String, required: true },
    kategori: { type: String, required: true },
    lomba: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Participants = mongoose.model('participants', participantsSchema);

// ROUTES
app.get('/', (req, res) => {
    res.send("Express server running on Vercel!");
});

app.post('/register', async (req, res) => {
    const { nama, blok_rumah, nohp, kategori, lomba } = req.body;

    if (!nama || !blok_rumah || !nohp || !kategori || !lomba) {
        return res.status(400).json({ message: 'please fill all fields.' });
    }

    try {
        const data = new Participants({
            nama,
            blok_rumah,
            nohp,
            kategori,
            lomba
        });
        await data.save();

        res.status(200).json({ message: 'Pendaftaran berhasil. Terima kasih!' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ message: 'Gagal menyimpan data pendaftaran.' });
    }
});

function maskPhoneNumber(nohp) {
    if (!nohp || nohp.length < 8) return nohp;
    const first4 = nohp.slice(0, 4);
    const last4 = nohp.slice(-4);
    const middle = '*'.repeat(nohp.length - 8);
    return `${first4}${middle}${last4}`;
}

app.get('/participants', async (req, res) => {
    try {
        const dataFromDb = await Participants.find().sort({ timestamp: -1 });

        const maskedData = dataFromDb.map(item => ({
            ...item._doc,
            nohp: maskPhoneNumber(item.nohp)
        }));

        res.status(200).json(maskedData);
    } catch (error) {
        console.error('Error fetching data dari DB:', error);
        res.status(500).json({ message: 'Gagal membaca data pendaftaran.' });
    }
});

app.get('/download-json', async (req, res) => {
    try {
        const dataToDownload = await Participants.find().sort({ timestamp: -1 });
        const jsonString = JSON.stringify(dataToDownload, null, 2);
        
        res.header('Content-Type', 'application/json');
        res.attachment('data_pendaftaran.json');
        return res.send(jsonString);
    } catch (err) {
        console.error('Error in /download-json:', err);
        return res.status(500).send('Terjadi kesalahan saat membuat file JSON.');
    }
});

// 👇 Ini bagian penting agar Vercel bisa handle Express
module.exports = app;
module.exports.handler = serverless(app);