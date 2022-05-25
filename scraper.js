const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const data_provinsi = JSON.parse(fs.readFileSync('data/data_provinsi.json'));

async function grap(id_prov) {
    const data = await axios({
        method: 'post',
        url: 'https://yankes.kemkes.go.id/app/siranap/rumah_sakit?jenis=1&propinsi=' + id_prov + '&kabkota=',
    })

    const $ = cheerio.load(data.data);
    let rumah_sakits = []
    let count = 0

    if ($('.col-md-10.offset-md-1.mb-2').find('span').text().trim() === 'data tidak ditemukan') {
        return res.status(404).send({ "status": "error, id provinsi or id kabkota not valid", "count": 0, "results": null })
    }

    if ($('.cardRS').length != 0) {
        $('.cardRS').each((i, data) => {
            count++;
            let nama_rs = $(data).find('h5').text();
            let alamat_rs = $(data).find('p').eq(0).text().trim()
            let hotline_rs = $(data).find('span').text()
            let id = new URL($(data).find('a').attr('href'));
            let id_rs = id.searchParams.get('kode_rs')

            rumah_sakits.push({
                "id_rs": id_rs,
                "id_provinsi": id_prov,
                "nama": nama_rs,
                "alamat": alamat_rs,
                "hotline": hotline_rs
            })
        })
    }
    return rumah_sakits;
}

async function scrap() {
    let rumah_sakits = [];
    for (let i = 0; i < data_provinsi.result.length; i++) {
        const rumah = await grap(data_provinsi.result[i].id_provinsi);
        Array.prototype.push.apply(rumah_sakits, rumah);
        console.log(data_provinsi.result[i].nama_provinsi);
    }
    console.log("DONE")
    fs.writeFile('data/data_rs.json', JSON.stringify(rumah_sakits), (err) => {
        if (err) console.log('Error writing file:', err)
    })
}


scrap();