const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const JSON_FILE_PATH = path.join(__dirname, 'pendaftaran.json');

let pendaftaranData = [];

const readJsonData = () => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(JSON_FILE_PATH)) {
            fs.writeFile(JSON_FILE_PATH, '[]', { encoding: 'utf8' }, (err) => {
                if (err) {
                    console.error('Error creating empty JSON file:', err);
                    return reject(err);
                }
                console.log('pendaftaran.json created as empty array.');
                return resolve([]);
            });
        } else {
            fs.readFile(JSON_FILE_PATH, { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    console.error('Error reading JSON file:', err);
                    return reject(err);
                }
                try {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData);
                } catch (parseErr) {
                    console.error('Error parsing JSON data:', parseErr);
                    return resolve([]);
                }
            });
        }
    });
};

const saveJsonData = () => {
    try {
        const jsonString = JSON.stringify(pendaftaranData, null, 2);
        fs.writeFile(JSON_FILE_PATH, jsonString, { encoding: 'utf8' }, err => {
            if (err) {
                console.error('Error writing JSON file:', err);
            } else {
                console.log('Data saved to pendaftaran.json');
            }
        });
    } catch (err) {
        console.error('Error stringifying data for JSON:', err);
    }
};

readJsonData()
    .then(data => {
        pendaftaranData = data;
    })
    .catch(err => {
        console.error('Failed to load initial data:', err);
    });

app.post('/submit-pendaftaran', async (req, res) => {
    const { nama, blok_rumah, nohp, kategori, lomba } = req.body;

    if (!nama || !blok_rumah || !nohp || !kategori || !lomba) {
        return res.status(400).json({ message: 'Semua kolom wajib diisi.' });
    }

    const newPendaftaran = {
        nama,
        blok_rumah,
        nohp,
        kategori,
        lomba,
        timestamp: new Date().toISOString()
    };

    pendaftaranData.push(newPendaftaran);
    saveJsonData(); 

    res.status(200).json({ message: 'Pendaftaran berhasil diterima!' });
});

app.get('/data-pendaftaran', async (req, res) => {
    try {
        const dataFromJson = await readJsonData();
        res.status(200).json(dataFromJson);
    } catch (error) {
        console.error('Error fetching data from JSON:', error);
        res.status(500).json({ message: 'Gagal membaca data pendaftaran.' });
    }
});

app.get('/download-json', async (req, res) => {
    try {
        const dataToDownload = await readJsonData();
        const jsonString = JSON.stringify(dataToDownload, null, 2);
        
        res.header('Content-Type', 'application/json');
        res.attachment('data_pendaftaran.json');
        return res.send(jsonString);
    } catch (err) {
        console.error('Error in /download-json:', err);
        return res.status(500).send('Terjadi kesalahan saat membuat file JSON.');
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});