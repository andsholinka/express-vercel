const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const serverless = require('serverless-http');
const ExcelJS = require('exceljs');
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

app.get('/download-excel', async (req, res) => {
    try {
        const data = await Participants.find().sort({ timestamp: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Pendaftaran');

        worksheet.columns = [
            { header: 'Nama', key: 'nama', width: 20 },
            { header: 'Blok Rumah', key: 'blok_rumah', width: 15 },
            { header: 'No HP', key: 'nohp', width: 20 },
            { header: 'Kategori', key: 'kategori', width: 15 },
            { header: 'Lomba', key: 'lomba', width: 30 }
        ];

        data.forEach(item => {
            worksheet.addRow({
                nama: item.nama,
                blok_rumah: item.blok_rumah,
                nohp: item.nohp,
                kategori: item.kategori,
                lomba: item.lomba
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=data_pendaftaran.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Gagal membuat file Excel.');
    }
});

// 👇 Ini bagian penting agar Vercel bisa handle Express
module.exports = app;
module.exports.handler = serverless(app);