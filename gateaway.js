const express = require('express');
const { json } = require('express/lib/response');
const axios = require('axios');

const cheerio = require('cheerio');
const fs = require('fs');
const req = require('express/lib/request');
const res = require('express/lib/response');
const { isRegExp } = require('util/types');
const { parse } = require('path');

const app = express();

const port = 3000;

app.listen(port, () => {
    console.log(`listening at http://localhost:${port}`)
});

const data_provinsi = JSON.parse(fs.readFileSync('data/data_provinsi.json'));

app.get('/', (req, res) => {
    const pesan = {
        "message": "nice",
        "endpoint": {
            "/provinsi": "untuk mendapat id dan nama provinsi",
            "/rs/<id_provinsi>": "untuk mendapatkan data rumah sakit berdasarkan id provinsi",
            "/rs/<id_provinsi>/<id_kabkota>": "untuk mendapatkan data rumah sakit berdasarkan id provinsi dan id kabupaten kota",
            "/detail_kamar/<id_rs>/<id_provinsi>": "untuk mendapatkan detail data kamar berdasarkan id rumah sakit dan id provinsi"
        }
    }

    res.send(pesan)
})

app.get('/provinsi', (req, res) => {
    res.send(data_provinsi)
});

app.get('/rs/:id_provinsi/:id_kabkota?', async(req, res) => {

    let kabkota = ""
    if ((req.params.id_kabkota) && req.params.id_kabkota.length != 0) {
        kabkota = req.params.id_kabkota
    }

    const data = await axios({
        method: 'post',
        url: 'https://yankes.kemkes.go.id/app/siranap/rumah_sakit?jenis=1&propinsi=' + req.params.id_provinsi + '&kabkota=' + kabkota,
    })

    const $ = cheerio.load(data.data);
    let rumah_sakits = [];
    let count = 0;

    if ($('.col-md-10.offset-md-1.mb-2').find('span').text().trim() === 'data tidak ditemukan') {
        return res.status(404).send({ "status": "error, id provinsi or id kabkota not valid", "count": 0, "results": null })
    }

    if ($('.cardRS').length != 0) {
        $('.cardRS').each((i, data) => {
            count++;
            let nama_rs = $(data).find('h5').text();
            let alamat_rs = $(data).find('p').eq(0).text().trim();
            let hotline_rs = $(data).find('span').text();
            let bed_igd = ($(data).find('p').find('b').text().length != 0) ? parseInt($(data).find('p').find('b').text()) : $(data).find('p').find('b').text().length;
            let id = new URL($(data).find('a').attr('href'));
            let id_rs = parseInt(id.searchParams.get('kode_rs'));

            rumah_sakits.push({
                "id_rs": id_rs,
                "nama": nama_rs,
                "alamat": alamat_rs,
                "bed_igd": bed_igd,
                "hotline": hotline_rs
            })
        })
    }

    res.send({ "status": "success", "count": count, "results": rumah_sakits })
})

app.get('/detail_kamar/:id_rs/:id_provinsi', async(req, res) => {
    const response = await axios({
        method: 'post',
        url: "https://yankes.kemkes.go.id/app/siranap/tempat_tidur?kode_rs=" + req.params.id_rs + "&jenis=1&propinsi=" + req.params.id_provinsi + "&kabkota=",
    })

    const $ = cheerio.load(response.data);
    let data_kamar = [];
    let count = 0

    if ($('.card').length != 0) {
        $('.card').each((index, value) => {
            count++;
            let struktur_kamar = {
                "nama_kamar": null,
                "last_update": null,
                "status": {
                    "tempat_tidur": null,
                    "kosong": null,
                    "antrian": null
                }
            }

            let statuskm = struktur_kamar.status;
            struktur_kamar.last_update = $(value).find('.col-md-6.col-12').text().trim().split('\n')[1].trim().replace("Update ", '')
            struktur_kamar.nama_kamar = $(value).find('.col-md-6.col-12').text().trim().split('\n')[0];
            statuskm.tempat_tidur = $(value).find('.col-md-4.col-4').text().match(/\d+/g)[0];
            statuskm.kosong = $(value).find('.col-md-4.col-4').text().match(/\d+/g)[1];

            if ($(value).find('.col-md-4.col-4').text().match(/\d+/g)[2] != null) {
                statuskm.antrian = $(value).find('.col-md-4.col-4').text().match(/\d+/g)[2];
            }

            data_kamar.push(struktur_kamar);
        })
    } else {
        return res.send({ "status": "error, id provinsi or id rs not valid", "count": 0, "results": null })
    }

    res.send({ "status": "success", "count": count, "results": data_kamar });
})


app.get('*', function(req, res) {
    res.status(404).send("do you know da way?");
});