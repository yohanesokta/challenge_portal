# Fitur Baru :

sekarang gini saat membuat soal generate kan short link juga untuk soal itu otomatis dan pastikan berhasil ya!

api : 
curl --location --request POST 'https://api.s.id/v1/links' \
--header 'X-Auth-Id;' \
--header 'X-Auth-Key;' \
--header 'Content-Type: application/json' \
--data-raw '{
  "long_url": "http://yourexamplelink.id/this-very-long-url"
}'

Response 
{
    "code": 200,
    "message": "link_created",
    "data": {
        "_id": "6673610e22b2eaa01abe4873",
        "id": 414736,
        "created_at": "2024-06-20T05:51:58.036434+07:00",
        "updated_at": "2024-06-20T05:51:58.036435+07:00",
        "short": "1JTi",
        "long_url": "https://example.com/test-link2",
        "blocked": false,
        "blocked_reason": null,
        "blocked_at": null,
        "microsite": false,
        "protected": false,
        "disposable": false,
        "adult": false,
        "archive_at": null
    }
}

dan juga untuk cek ketersediaan 

curl --location --request POST 'https://api.s.id/v1/links/available' \
--header 'X-Auth-Id;' \
--header 'X-Auth-Key;' \
--header 'Content-Type: application/json' \
--data-raw '{
    "short": "short-name"
}'


Response : 

{
    "code": 200,
    "message": "available",
    "data": null
}



# Update View



lalu pada tombol bagikan itu bukan langsung nge copy namun menampilkan shortlink dengan popup dan font yang besar. asumsi nanti ku tampilkan ke proyektor dan mahasiswa bisa akses.

ada di .env sudah kutambahkan S_ID id dan Key
