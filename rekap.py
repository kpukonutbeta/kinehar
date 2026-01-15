import datetime
import time
import requests
from math import ceil


def get_gas_url():
    with open('gas.url', 'r') as f:
        return f.read().strip()


def get_count_data():
	resp = requests.get(get_gas_url() + '?action=kinerja_count')
	return resp.json()
	

def format_table_with_status(json_data):
    hari_ini = datetime.datetime.now()
    hari_ini_formatted = hari_ini.strftime("%d %B %Y")
    
    # Header Pesan
    msg = f"📊 *REKAP JUMLAH KINERJA HARIAN* \n({hari_ini_formatted})\n\n"
    msg += "```\n" # Mulai mode monospace
    msg += "ST | HARI | PEGAWAI\n"
    msg += "---------------------------\n"
    
    # Batas minimal hari untuk dianggap "aman" (status centang)
    nilai_ambang = hari_ini.day - ceil(hari_ini.day / 5 * 2)

    for i, (pegawai, jumlah) in enumerate(json_data["data"].items(), 1):
        # Tentukan status emoji (Emoji ditaruh di luar monospace agar tidak merusak lebar kolom)
        status = "✅" if jumlah >= nilai_ambang else "⚠️"
        
        # Ambil nama saja dan potong jika terlalu panjang (max 15 karakter)
        pegawai_split = pegawai.split('-')
        nip = pegawai_split[0].strip()
        nama_saja = pegawai_split[1].strip()
        nama_pendek = (nama_saja[:13] + "..") if len(nama_saja) > 13 else nama_saja.ljust(15)
        jumlah_str = str(jumlah) if jumlah > 9 else ' {}'.format(jumlah)
        # Format baris (Status dipisah dari blok monospace agar selaras)
        row_text = f" {jumlah_str.ljust(4)} | {nama_pendek}"
        msg += f"{status} |{row_text}\n"
    
    msg += "---------------------------\n```\n"
    # msg += "_Keterangan: ✅ (Min. 5 Hari)_"
    
    return msg


# 2. Format Pesan
pesan_final = format_table_with_status(get_count_data())
print(pesan_final)
