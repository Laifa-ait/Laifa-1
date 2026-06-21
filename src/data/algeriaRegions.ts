export interface WilayaData {
  code: string;
  name: string;
  dairas: Record<string, string[]>;
}

// 58 Algerian Wilayas mapping with key Daïras (arrondissements) and Communes (baladias)
export const ALGERIA_REGIONS: Record<string, WilayaData> = {
  "01 Adrar": {
    code: "01",
    name: "Adrar",
    dairas: {
      "Adrar": ["Adrar", "Bouda", "Ouled Ahmed Tamimi"],
      "Fenoughil": ["Fenoughil", "Tamest", "In Zghmir"],
      "Reggane": ["Reggane", "Sali"],
      "Aoulef": ["Aoulef", "Timiaouine", "Akabli", "Tit"],
      "Zaouiet Kounta": ["Zaouiet Kounta", "In Ghar"],
      "Tsabit": ["Tsabit", "Sbaa"]
    }
  },
  "02 Chlef": {
    code: "02",
    name: "Chlef",
    dairas: {
      "Chlef": ["Chlef", "Sendjas", "Oum Drou"],
      "Ténès": ["Ténès", "Sidi Akkacha", "Sidi Abderrahmane"],
      "Ouled Farès": ["Ouled Farès", "Chettia", "Labiod Medjadja"],
      "Boukadir": ["Boukadir", "Sobha", "Oued Sly"],
      "Karimia": ["Karimia", "Harchoun", "Beni Bouattab"],
      "Taougrit": ["Taougrit", "Dahra"],
      "Oued Fodda": ["Oued Fodda", "Beni Rached", "Ouled Abbes"],
      "El Marsa": ["El Marsa", "Moussadek"],
      "Abou El Hassen": ["Abou El Hassen", "Talassa", "Tadjena"]
    }
  },
  "03 Laghouat": {
    code: "03",
    name: "Laghouat",
    dairas: {
      "Laghouat": ["Laghouat"],
      "Ksar El Hirane": ["Ksar El Hirane", "Bennasser Benchohra"],
      "Sidi Makhlouf": ["Sidi Makhlouf", "El Assafia"],
      "Hassi R'Mel": ["Hassi R'Mel", "Hassi Delaa"],
      "Ain Madhi": ["Ain Madhi", "Tadjemout", "Tadjrouna", "El Houaita", "Kheneg"],
      "Gueltet Sidi Saad": ["Gueltet Sidi Saad", "Ain Sidi Ali", "Beidha"],
      "Aflou": ["Aflou", "Sebgeg", "Sidi Bouzid"],
      "Oued Morra": ["Oued Morra", "El Ghaicha"]
    }
  },
  "04 Oum El Bouaghi": {
    code: "04",
    name: "Oum El Bouaghi",
    dairas: {
      "Oum El Bouaghi": ["Oum El Bouaghi", "Ain Zitoun"],
      "Ain Beida": ["Ain Beida", "Ain Babouche", "Zorg"],
      "Ain M'lila": ["Ain M'lila", "Ouled Gacem", "Ouled Hamla"],
      "F'kirina": ["F'kirina", "Oued Nini"],
      "Souk Naamane": ["Souk Naamane", "Bir Chouhada", "Ouled Zoua"],
      "Ain Fakroun": ["Ain Fakroun", "El Fedjoudj Boughrara El Saoudi"],
      "Meskyana": ["Meskyana", "El Belala", "Rahia", "Blala"]
    }
  },
  "05 Batna": {
    code: "05",
    name: "Batna",
    dairas: {
      "Batna": ["Batna", "Fesdis", "Oued Chaaba"],
      "Arris": ["Arris", "Tighanimine"],
      "Barika": ["Barika", "M'doukel", "Bitam"],
      "Merouana": ["Merouana", "Oued El Ma", "Ksar Bellezma", "Hidoussa"],
      "N'Gaous": ["N'Gaous", "Boumagueur", "Sefiane"],
      "Ain Touta": ["Ain Touta", "Maafa", "Beni Foudhala El Hakania", "Ouled Aouf"],
      "Tazoult": ["Tazoult", "Oued Taga"],
      "Chemora": ["Chemora", "Boulhilat"],
      "Théniet El Abed": ["Théniet El Abed", "Chir", "Oued Taga"],
      "Cheddi": ["Cheddi", "Talkhamt"]
    }
  },
  "06 Béjaïa": {
    code: "06",
    name: "Béjaïa",
    dairas: {
      "Béjaïa": ["Béjaïa", "Oued Ghir"],
      "Amizour": ["Amizour", "Beni Djellil", "Semaoun", "Feraoun"],
      "Akbou": ["Akbou", "Chellata", "Ighram", "Tamokra"],
      "Sidi Aïch": ["Sidi Aïch", "Leflaye", "Tinabdher", "Tifra"],
      "El Kseur": ["El Kseur", "Ouzellaguen", "Adekar"],
      "Kherrata": ["Kherrata", "Draâ El Kaïd"],
      "Souk El Tenine": ["Souk El Tenine", "Melbou", "Aokas"],
      "Tichy": ["Tichy", "Bouhelhal"],
      "Chemini": ["Chemini", "Souk Oufella", "Tibane"]
    }
  },
  "07 Biskra": {
    code: "07",
    name: "Biskra",
    dairas: {
      "Biskra": ["Biskra", "El Hadjeb"],
      "Ouled Djellal": ["Ouled Djellal", "Al-Chabaia"],
      "Sidi Okba": ["Sidi Okba", "Chetma", "El Haouch", "Ain Naga"],
      "Tolga": ["Tolga", "Bouchagroune", "Lichana", "M'Chouneche"],
      "El Outaya": ["El Outaya", "Branis"],
      "Zeribet El Oued": ["Zeribet El Oued", "El Feidh"],
      "Djemorah": ["Djemorah", "Branis"]
    }
  },
  "08 Béchar": {
    code: "08",
    name: "Béchar",
    dairas: {
      "Béchar": ["Béchar"],
      "Kenadsa": ["Kenadsa", "Meridja"],
      "Abadla": ["Abadla", "Erg Ferradj", "Machraa Houari Boumediene"],
      "Lahmar": ["Lahmar", "Boukais", "Mogheul"],
      "Taghit": ["Taghit"],
      "Béni Abbès": ["Béni Abbès", "Tamtert"]
    }
  },
  "09 Blida": {
    code: "09",
    name: "Blida",
    dairas: {
      "Blida": ["Blida", "Bouarfa"],
      "Ouled Yaïch": ["Ouled Yaïch", "Beni Mered", "Chréa"],
      "Boufarik": ["Boufarik", "Soumaa", "Guerrouaou"],
      "Larbaa": ["Larbaa", "Souhane"],
      "Meftah": ["Meftah", "Djebabra"],
      "El Affroun": ["El Affroun", "Oued Djer"],
      "Mouzaïa": ["Mouzaïa", "Chiffa", "Ain Romana"],
      "Bouinen": ["Bouinen", "Chebli"]
    }
  },
  "10 Bouira": {
    code: "10",
    name: "Bouira",
    dairas: {
      "Bouira": ["Bouira", "Ain El Turc", "Ait Laziz"],
      "Lakhdaria": ["Lakhdaria", "Kadiria", "Maala", "Bouderbala", "Zbarbar"],
      "Sour El Ghozlane": ["Sour El Ghozlane", "Maamora", "Dirah", "Dechmia"],
      "Ain Bessem": ["Ain Bessem", "Ain Laloui", "Ain El Hadjar"],
      "M'Chedallah": ["M'Chedallah", "Saharidj", "Chorfa", "Ahnif", "Ath Mansour"],
      "Bechloul": ["Bechloul", "El Adjiba", "Ahl El Ksar"]
    }
  },
  "11 Tamanrasset": {
    code: "11",
    name: "Tamanrasset",
    dairas: {
      "Tamanrasset": ["Tamanrasset", "In Amguel"],
      "Silet": ["Silet", "Abalsa"],
      "Tin Zaouatine": ["Tin Zaouatine"],
      "In Salah": ["In Salah", "Foggaret Ezzaouia"]
    }
  },
  "12 Tébessa": {
    code: "12",
    name: "Tébessa",
    dairas: {
      "Tébessa": ["Tébessa"],
      "Bir El Ater": ["Bir El Ater", "El Ogla El Malha"],
      "Cheria": ["Cheria", "Telidjen"],
      "Ouenza": ["Ouenza", "Ain Zerga", "Meridj"],
      "Al Aouinet": ["El Aouinet", "Boukhadra"],
      "Morsott": ["Morsott", "Bir Dheb"]
    }
  },
  "13 Tlemcen": {
    code: "13",
    name: "Tlemcen",
    dairas: {
      "Tlemcen": ["Tlemcen Centre", "Mansourah"],
      "Maghnia": ["Maghnia", "Hammama Bouhadjar"],
      "Ghazaouet": ["Ghazaouet", "Souahlia", "Tianet"],
      "Nedroma": ["Nedroma", "Djebala"],
      "Sebdou": ["Sebdou", "El Gor", "El Aricha"],
      "Remchi": ["Remchi", "Ain Youcef", "Beni Ouarsous"],
      "Hennaya": ["Hennaya", "Ouled Riyah", "Azioul"],
      "Bensekrane": ["Bensekrane", "Sidi Abdelli"]
    }
  },
  "14 Tiaret": {
    code: "14",
    name: "Tiaret",
    dairas: {
      "Tiaret": ["Tiaret"],
      "Sougueur": ["Sougueur", "Tousnina", "Faidhet El Botma"],
      "Frenda": ["Frenda", "Ain Hadid"],
      "Dahmouni": ["Dahmouni", "Ain Bouchekif"],
      "Rahouia": ["Rahouia", "Guertoufa"],
      "Mahdia": ["Mahdia", "Ain Deheb", "Chehaima"]
    }
  },
  "15 Tizi Ouzou": {
    code: "15",
    name: "Tizi Ouzou",
    dairas: {
      "Tizi Ouzou": ["Tizi Ouzou"],
      "Azazga": ["Azazga", "Freha", "Yakouren", "Ifigha", "Zekri"],
      "Draâ Ben Khedda": ["Draâ Ben Khedda", "Tadmaït", "Tirmitine", "Sidi Namane"],
      "Larbâa Nath Irathen": ["Larbâa Nath Irathen", "Aït Aggouacha", "Irdjen"],
      "Tigzirt": ["Tigzirt", "Iflissen", "Mizrana"],
      "Boghni": ["Boghni", "Assi Youcef", "Mechtras", "Bounouh"],
      "Azeffoun": ["Azeffoun", "Aït Chafâa", "Akerrou", "Aghribs"],
      "Ouadhias": ["Ouadhias", "Tizi N'Tleta", "Aït Bouaddou"],
      "Maâtkas": ["Maâtkas", "Souk El Tenine"]
    }
  },
  "16 Alger": {
    code: "16",
    name: "Alger",
    dairas: {
      "Sidi M'Hamed": ["Alger Centre", "Sidi M'Hamed", "El Biar", "El Mouradia"],
      "Bab El Oued": ["Bab El Oued", "Casbah", "Bologhine", "Oued Koriche", "Rais Hamidou"],
      "Bouzareah": ["Bouzareah", "Beni Messous", "Dely Ibrahim", "El Achour"],
      "Bir Mourad Raïs": ["Bir Mourad Raïs", "Hydra", "Birkhadem", "Saoula", "Draria"],
      "Hussein Dey": ["Hussein Dey", "Kouba", "El Magharia", "Bourouba"],
      "El Harrach": ["El Harrach", "Oued Smar", "Bachdjerrah", "Bourouba"],
      "Dar El Beïda": ["Dar El Beïda", "Bab Ezzouar", "Bordj El Kiffan", "Bordj El Bahri", "El Marsa", "Mohammadia"],
      "Chéraga": ["Chéraga", "Dely Ibrahim", "Ouled Fayet", "Ain Benian", "Hammamet"],
      "Zéralda": ["Zéralda", "Staoueli", "Souidania", "Rahmania", "Mahelma"],
      "Baraki": ["Baraki", "Les Eucalyptus", "Sidi Moussa"],
      "Birtouta": ["Birtouta", "Ouled Chebel", "Tessala El Merdja"],
      "Rouïba": ["Rouïba", "Reghaïa", "H'Raoua"]
    }
  },
  "17 Djelfa": {
    code: "17",
    name: "Djelfa",
    dairas: {
      "Djelfa": ["Djelfa"],
      "Hassi Bahbah": ["Hassi Bahbah", "Zaafrane", "Ain Maabed"],
      "Ain Oussera": ["Ain Oussera", "Guernini"],
      "Messaad": ["Messaad", "Delldoul", "Selmana"],
      "Dar Chiokh": ["Dar Chiokh", "M'Liliha"],
      "El Idrissia": ["El Idrissia", "Douis"]
    }
  },
  "18 Jijel": {
    code: "18",
    name: "Jijel",
    dairas: {
      "Jijel": ["Jijel"],
      "Taher": ["Taher", "Emir Abdelkader", "Chahna", "Oudjana"],
      "El Milia": ["El Milia", "Ouled Yahia Khedrouche"],
      "El Ancer": ["El Ancer", "Djemaa Beni Habibi"],
      "Sidi Abdelaziz": ["Sidi Abdelaziz", "Kheiri Oued Adjoul"],
      "Chekfa": ["Chekfa", "El Kennar Nouchfi"]
    }
  },
  "19 Sétif": {
    code: "19",
    name: "Sétif",
    dairas: {
      "Sétif": ["Sétif Centre", "Ain El Safsaf"],
      "El Eulma": ["El Eulma", "Bazer Sakhra", "Guelta Zerka"],
      "Bouandas": ["Bouandas", "Ait Tizi", "Ait Naoual Ouada"],
      "Ain Arnat": ["Ain Arnat", "Ain Abessa", "Mazloug"],
      "Ain Oulmene": ["Ain Oulmene", "Guellal", "Ksar El Abtal"],
      "Amoucha": ["Amoucha", "Oued El Bared", "Tizi N'Bechar"],
      "Salah Bey": ["Salah Bey", "Ras El Oued"],
      "Guenzet": ["Guenzet", "Harbil"],
      "Bougaa": ["Bougaa", "Ain Legradj"]
    }
  },
  "20 Saïda": {
    code: "20",
    name: "Saïda",
    dairas: {
      "Saïda": ["Saïda"],
      "Ain El Hadjar": ["Ain El Hadjar", "Moulay Larbi"],
      "El Hassasna": ["El Hassasna", "Maamora"],
      "Youb": ["Youb", "Doui Thabet"],
      "Sidi Boubekeur": ["Sidi Boubekeur", "Ouled Khaled"]
    }
  },
  "21 Skikda": {
    code: "21",
    name: "Skikda",
    dairas: {
      "Skikda": ["Skikda", "Hamadi Krouma", "Filfila"],
      "El Harrouch": ["El Harrouch", "Salah Bouchaour", "Zerdaza"],
      "Azzaba": ["Azzaba", "Ain Charchar", "Djendel Saadi Mohamed"],
      "Collo": ["Collo", "Cheraia", "Echkila"],
      "Aïn Kechra": ["Ain Kechra", "Ouldja Boulhbal"],
      "Tamalous": ["Tamalous", "Bin El Ouidene"]
    }
  },
  "22 Sidi Bel Abbès": {
    code: "22",
    name: "Sidi Bel Abbès",
    dairas: {
      "Sidi Bel Abbès": ["Sidi Bel Abbès"],
      "Sfisef": ["Sfisef", "M'id", "Ain Aden"],
      "Tessala": ["Tessala", "Ain Thrid", "Sehala Thaoura"],
      "Sidi Lahcene": ["Sidi Lahcene", "Sidi Khaled", "Sidi Yacoub"],
      "Ben Badis": ["Ben Badis", "Hassi Dahou"],
      "Mostefa Ben Brahim": ["Mostefa Ben Brahim", "Sidi Bel El Atteuf"]
    }
  },
  "23 Annaba": {
    code: "23",
    name: "Annaba",
    dairas: {
      "Annaba": ["Annaba Centre", "Seraïdi"],
      "El Bouni": ["El Bouni"],
      "El Hadjar": ["El Hadjar", "Sidi Amar"],
      "Berrahal": ["Berrahal", "Oued El Aneb", "Trat"],
      "Chetaïbi": ["Chetaïbi"]
    }
  },
  "24 Guelma": {
    code: "24",
    name: "Guelma",
    dairas: {
      "Guelma": ["Guelma", "Ben Djerrah"],
      "Heliopolis": ["Heliopolis", "Bouati Mahmoud", "El Fedjoudj"],
      "Oued Zenati": ["Oued Zenati", "Ain Reggada", "Bordj Sabath"],
      "Bouchegouf": ["Bouchegouf", "Medjez Sfa", "Oued Fragha"],
      "Hammama Debagh": ["Hammama Debagh", "Roknia"]
    }
  },
  "25 Constantine": {
    code: "25",
    name: "Constantine",
    dairas: {
      "Constantine": ["Constantine"],
      "El Khroub": ["El Khroub", "Ain Smara", "Ouled Rahmoune"],
      "Hamma Bouziane": ["Hamma Bouziane", "Didouche Mourad"],
      "Zighoud Youcef": ["Zighoud Youcef", "Beni Hameidane"]
    }
  },
  "26 Médéa": {
    code: "26",
    name: "Médéa",
    dairas: {
      "Médéa": ["Médéa", "Tamesguida"],
      "Ouzera": ["Ouzera", "Taza", "El Omaria"],
      "Berrouaghia": ["Berrouaghia", "Rebaia", "Seghouane"],
      "Ksar El Boukhari": ["Ksar El Boukhari", "Saneg"],
      "Tablat": ["Tablat", "Deux Bassins"],
      "Beni Slimane": ["Beni Slimane", "Sidi Naame"]
    }
  },
  "27 Mostaganem": {
    code: "27",
    name: "Mostaganem",
    dairas: {
      "Mostaganem": ["Mostaganem", "Mazagran"],
      "Hassi Mamèche": ["Hassi Mamèche", "Stidia", "Ain Nouissy"],
      "Ain Tédélès": ["Ain Tédélès", "Sour", "Oued El Kheir"],
      "Sidi Lakhdar": ["Sidi Lakhdar", "Hadjadj", "Abdelmalek Ramdane"],
      "Achaacha": ["Achaacha", "Khadra"]
    }
  },
  "28 M'Sila": {
    code: "28",
    name: "M'Sila",
    dairas: {
      "M'Sila": ["M'Sila"],
      "Bou Saada": ["Bou Saada", "El Hamel", "Oultene"],
      "Sidi Aissa": ["Sidi Aissa", "Bouti Sayeh"],
      "Maadid": ["Maadid", "Ouled Addi Guebala"],
      "Magne": ["Magne", "Belaiba"]
    }
  },
  "29 Mascara": {
    code: "29",
    name: "Mascara",
    dairas: {
      "Mascara": ["Mascara"],
      "Sig": ["Sig", "Oghaz", "Bou Henni"],
      "Mohammadia": ["Mohammadia", "El Ghomri", "Ferraguig"],
      "Ghriss": ["Ghriss", "Makhda", "Maoussa"],
      "Tighennif": ["Tighennif", "Sidi Kada"],
      "Oued Taria": ["Oued Taria", "Guerdjoum"]
    }
  },
  "30 Ouargla": {
    code: "30",
    name: "Ouargla",
    dairas: {
      "Ouargla": ["Ouargla", "Rouissat"],
      "Hassi Messaoud": ["Hassi Messaoud"],
      "N'Goussa": ["N'Goussa"],
      "Sidi Khouiled": ["Sidi Khouiled", "Ain Beida"]
    }
  },
  "31 Oran": {
    code: "31",
    name: "Oran",
    dairas: {
      "Oran": ["Oran Centre"],
      "Bir El Djir": ["Bir El Djir", "Hassi Bounif", "Hassi Ben Okba"],
      "Es Senia": ["Es Senia", "Sidi Chami", "El Kerma"],
      "Arzew": ["Arzew", "Sidi Benyebka"],
      "Gdyel": ["Gdyel", "Hassi Mefsoukh", "Ben Freha"],
      "Moutha": ["Mers El Kébir", "Bousfer", "El Ançor"],
      "Oued Tlelat": ["Oued Tlelat", "Tafraoui", "El Braya"],
      "Boutlelis": ["Boutlelis", "Misserghin", "Ain El Kerma"]
    }
  },
  "32 El Bayadh": {
    code: "32",
    name: "El Bayadh",
    dairas: {
      "El Bayadh": ["El Bayadh"],
      "Rogassa": ["Rogassa", "Kef El Ahmar"],
      "Chellala": ["Chellala", "El Mehara"],
      "Abiodh Sidi Cheikh": ["Abiodh Sidi Cheikh", "Ain El Orak"],
      "Bougtoub": ["Bougtoub", "El Kheiter"]
    }
  },
  "33 Illizi": {
    code: "33",
    name: "Illizi",
    dairas: {
      "Illizi": ["Illizi"],
      "In Amenas": ["In Amenas", "Debdeb", "Bordj Omar Driss"]
    }
  },
  "34 Bordj Bou Arréridj": {
    code: "34",
    name: "Bordj Bou Arréridj",
    dairas: {
      "Bordj Bou Arréridj": ["Bordj Bou Arréridj"],
      "Ras El Oued": ["Ras El Oued", "Ain Taghrout"],
      "Mansoura": ["Mansoura", "Ben Daoud", "El M'hir"],
      "Medjana": ["Medjana", "El Achir"],
      "Bir Kasdali": ["Bir Kasdali", "Sidi Embarek"]
    }
  },
  "35 Boumerdès": {
    code: "35",
    name: "Boumerdès",
    dairas: {
      "Boumerdès": ["Boumerdès", "Corso", "Tidjelabine"],
      "Boudouaou": ["Boudouaou", "Boudouaou El Bahri", "El Kharrouba"],
      "Dellys": ["Dellys", "Ben Choud", "Aafir"],
      "Khemis El Khechna": ["Khemis El Khechna", "Hammedi", "Ouled Moussa"],
      "Thenia": ["Thenia", "Souk El Had", "Si Mustapha"],
      "Naciria": ["Naciria", "Ouled Isa"]
    }
  },
  "36 El Tarf": {
    code: "36",
    name: "El Tarf",
    dairas: {
      "El Tarf": ["El Tarf", "Zitouna"],
      "El Kala": ["El Kala", "Souarekh", "Ramla"],
      "Dréan": ["Dréan", "Chihani", "Chebaita Mokhtar"],
      "Besbes": ["Besbes", "Asfour"]
    }
  },
  "37 Tindouf": {
    code: "37",
    name: "Tindouf",
    dairas: {
      "Tindouf": ["Tindouf", "Oum El Assel"]
    }
  },
  "38 Tissemsilt": {
    code: "38",
    name: "Tissemsilt",
    dairas: {
      "Tissemsilt": ["Tissemsilt", "Ouled Bessem"],
      "Theinet El Had": ["Theniet El Had", "Sidi Boutouchent"],
      "Lardjem": ["Lardjem", "Tamalaht"]
    }
  },
  "39 El Oued": {
    code: "39",
    name: "El Oued",
    dairas: {
      "El Oued": ["El Oued", "Kouinine"],
      "Guemar": ["Guemar", "Ourmas"],
      "Bayadha": ["Bayadha", "Robbah"],
      "Debila": ["Debila", "Hassani Abdelkrim"],
      "Hassi Khalifa": ["Hassi Khalifa"]
    }
  },
  "40 Khenchela": {
    code: "40",
    name: "Khenchela",
    dairas: {
      "Khenchela": ["Khenchela"],
      "Kais": ["Kais", "Taouzient"],
      "Chechar": ["Chechar", "Khiran"],
      "Bouhmama": ["Bouhmama", "Chelia"],
      "Babhar": ["Babhar", "Ain Touila"]
    }
  },
  "41 Souk Ahras": {
    code: "41",
    name: "Souk Ahras",
    dairas: {
      "Souk Ahras": ["Souk Ahras"],
      "Sedrata": ["Sedrata", "Khemissa"],
      "M'daourouch": ["M'daourouch", "Tiffech"],
      "Merahna": ["Merahna", "Ouled Driss"],
      "Haddada": ["Haddada"]
    }
  },
  "42 Tipaza": {
    code: "42",
    name: "Tipaza",
    dairas: {
      "Tipaza": ["Tipaza"],
      "Cherchell": ["Cherchell", "Sidi Ghiles", "Hadjout"],
      "Kolea": ["Kolea", "Chaiba", "Attatba"],
      "Bou Ismail": ["Bou Ismail", "Fouka", "Aghbal"],
      "Gouraya": ["Gouraya", "Aghbal", "Larhat"],
      "Ahmer El Ain": ["Ahmer El Ain", "Bourkika"]
    }
  },
  "43 Mila": {
    code: "43",
    name: "Mila",
    dairas: {
      "Mila": ["Mila", "Ain Tine"],
      "Chelghoum Laid": ["Chelghoum Laid", "Oued Athmania"],
      "Teleghma": ["Teleghma", "Oued Seguen"],
      "Ferdjioua": ["Ferdjioua", "Tassadane Haddada"],
      "Grarem Gouga": ["Grarem Gouga", "Hamala"]
    }
  },
  "44 Aïn Defla": {
    code: "44",
    name: "Aïn Defla",
    dairas: {
      "Aïn Defla": ["Aïn Defla"],
      "Miliana": ["Miliana", "Ben Allal"],
      "Khemis Miliana": ["Khemis Miliana", "Sidi Lakhdar"],
      "El Attaf": ["El Attaf", "Tiberkanine"],
      "Djelida": ["Djelida", "Bourached"],
      "Rouina": ["Rouina", "Zeddine"]
    }
  },
  "45 Naâma": {
    code: "45",
    name: "Naâma",
    dairas: {
      "Naâma": ["Naâma"],
      "Méchria": ["Méchria", "Ain Ben Khelil"],
      "Aïn Séfra": ["Aïn Séfra", "Tiout", "Sfissifa"],
      "Asla": ["Asla"]
    }
  },
  "46 Aïn Témouchent": {
    code: "46",
    name: "Aïn Témouchent",
    dairas: {
      "Aïn Témouchent": ["Aïn Témouchent", "Sidi Ben Adda"],
      "Hammam Bouhadjar": ["Hammam Bouhadjar", "Oued Berkèche"],
      "Béni Saf": ["Béni Saf", "Sidi Safi", "El Emir Abdelkader"],
      "El Amria": ["El Amria", "Bouzedjar"],
      "Aïn Kihal": ["Aïn Kihal"]
    }
  },
  "47 Ghardaïa": {
    code: "47",
    name: "Ghardaïa",
    dairas: {
      "Ghardaïa": ["Ghardaïa", "Dhayet Bendhahoua"],
      "Metlili": ["Metlili", "Sebseb"],
      "Bounoura": ["Bounoura", "El Atteuf"],
      "El Guerrara": ["El Guerrara"],
      "Zelfana": ["Zelfana"]
    }
  },
  "48 Relizane": {
    code: "48",
    name: "Relizane",
    dairas: {
      "Relizane": ["Relizane", "Bendaoud"],
      "Oued Rhiou": ["Oued Rhiou", "Ouarizane"],
      "Mazouna": ["Mazouna", "El Guettar"],
      "Yellel": ["Yellel", "Sidi Saada"],
      "Sidi M'Hamed Ben Ali": ["Sidi M'Hamed Ben Ali"]
    }
  },
  "49 El M'Ghair": {
    code: "49",
    name: "El M'Ghair",
    dairas: {
      "El M'Ghair": ["El M'Ghair", "Oum Touyour"],
      "Djamaa": ["Djamaa", "Sidi Amrane", "Tendirla"]
    }
  },
  "50 El Meniaa": {
    code: "50",
    name: "El Meniaa",
    dairas: {
      "El Meniaa": ["El Meniaa", "Hassi Gara"],
      "Hassi Fhel": ["Hassi Fhel"]
    }
  },
  "51 Ouled Djellal": {
    code: "51",
    name: "Ouled Djellal",
    dairas: {
      "Ouled Djellal": ["Ouled Djellal", "Ech Chaiba"],
      "Sidi Khaled": ["Sidi Khaled", "Besbes"]
    }
  },
  "52 Bordj Baji Mokhtar": {
    code: "52",
    name: "Bordj Baji Mokhtar",
    dairas: {
      "Bordj Baji Mokhtar": ["Bordj Baji Mokhtar"],
      "Timiaouine": ["Timiaouine"]
    }
  },
  "53 Béni Abbès": {
    code: "53",
    name: "Béni Abbès",
    dairas: {
      "Béni Abbès": ["Béni Abbès", "Tamtert"],
      "Kerzaz": ["Kerzaz", "Timoudi"],
      "Igli": ["Igli"]
    }
  },
  "54 Timimoun": {
    code: "54",
    name: "Timimoun",
    dairas: {
      "Timimoun": ["Timimoun", "Ouled Said"],
      "Aougrout": ["Aougrout", "Deldoul"],
      "Charouine": ["Charouine"]
    }
  },
  "55 Touggourt": {
    code: "55",
    name: "Touggourt",
    dairas: {
      "Touggourt": ["Touggourt", "Nezla", "Tebesbest"],
      "Taibet": ["Taibet", "M'Naguer"],
      "Temacine": ["Temacine", "Balidat Ameur"]
    }
  },
  "56 Djanet": {
    code: "56",
    name: "Djanet",
    dairas: {
      "Djanet": ["Djanet"],
      "Bordj El Haouas": ["Bordj El Haouas"]
    }
  },
  "57 In Salah": {
    code: "57",
    name: "In Salah",
    dairas: {
      "In Salah": ["In Salah", "Foggaret Ezzaouia"],
      "In Ghar": ["In Ghar"]
    }
  },
  "58 In Guezzam": {
    code: "58",
    name: "In Guezzam",
    dairas: {
      "In Guezzam": ["In Guezzam"],
      "Tin Zaouatine": ["Tin Zaouatine"]
    }
  }
};
