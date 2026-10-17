-- One-time sync: course name / location / details / coordinates were edited in
-- the Supabase dashboard, so production drifted from the seed migrations. From
-- now on git (supabase/seeds/courses/*.json) is the single source of truth.
-- On production this is a no-op (values copied from it on 2026-10-17); on a
-- fresh database (local, CI) it replays those dashboard edits.

update public.courses c
set name = v.name, location = v.location, details = v.details, lat = v.lat, lng = v.lng
from (
values
  ('aasmae-discgolfi-park', 'Ääsmäe discgolfipark', 'Ääsmäe discgolfi park, Harjumaa, Estonia', 'Tallinna lähedal (~28km), Saue vallas asuv algaja sõbralik discgolfi park. Kokku 18 rada, millest enamus asuvad metsas.

Amenities: Sõidukite parkla juures asub Ääsmäe külaplats koos erinevate atraktsioonidega lastele ja kuivkäimla., Parkla juures asub ka Meie toidupood.', 59.2429392, 24.4972743),
  ('abja-paluoja-discgolfi-park', 'Abja-Paluoja discgolfipark', 'Abja-Paluoja discgolfi park, Viljandimaa, Estonia', null, 58.1255742, 25.3677556),
  ('aegviidu-discgolfi-park', 'Aegviidu discgolfipark', 'Aegviidu discgolfi park, Harjumaa, Estonia', 'Harjumaal Aegviidus paiknev 9 korviga discgolfi park, mis on sobilik algajatele.', 59.2885344295949, 25.6033855676651),
  ('ala-discgolfi-park', 'Ala discgolfipark', 'Ala discgolfi park, Valgamaa, Estonia', 'Ala kooli ümbruses kulgev 9-korviline rada. Valdavalt avar, aga on ka mõned metsasemad rajad.', 58.012925, 25.6925194444444),
  ('albu-manni-discgolfipark', 'Albu Männi discgolfipark', 'Albu Männi, Järvamaa, Estonia', 'Üheksa rajaline metsarada.', 59.143583, 25.655278),
  ('alutaguse-discgolfipark', 'Alutaguse discgolfipark', 'Alutaguse, Ida-Virumaa, Estonia', null, 59.2894182, 27.5585285),
  ('aravete-discgolfi-park', 'Aravete discgolfipark', 'Aravete, Järvamaa, Estonia', null, 59.1430484236616, 25.7543671131134),
  ('are-moisapargi-discgolfi-park', 'Are Mõisapargi discgolfipark', 'Are Mõisapargi discgolfi park, Pärnumaa, Estonia', 'Pärnumaal Are mõisapargis asuvas discgolfi pargis on 9 korvi ning radade kogupikkus on 648 meetrit.', 58.5294162373201, 24.5839262008667),
  ('audru-kooli-discgolfi-park', 'Audru Kooli discgolfipark', 'Audru Kooli, Pärnumaa, Estonia', 'Lühikene alustava mängija sõbralik 6 korviga rada Audru koolimaja vahetus läheduses.', 58.421259, 24.3139363),
  ('avinurme-discgolfi-park', 'Avinurme discgolfipark', 'Avinurme discgolfi park, Jõgevamaa, Estonia', 'Avinurmes 9 korviline avatud väljak, algab ja lõppeb staadioni juures.', 58.9851992958869, 26.8698441982269),
  ('buen-kiiu', 'Buen Kiiu discgolfipark', 'Nõmmiku, Kiiu alevik, Kuusalu vald, Harjumaa, Estonia', 'Päevapilet: 7 €

Kuusalu Disc Golf MTÜ
+372 502 7595
kuusaludg@gmail.com', 59.4368885733666, 25.3868775254051),
  ('ebavere-discgolfi-park', 'Ebavere discgolfipark', 'Ebavere discgolfi park, lääneviru, Estonia', null, 59.1044605, 26.2300227000001),
  ('elva-lasketiiru-discgolfi-park', 'Elva Lasketiiru discgolfipark', 'Elva Lasketiiru discgolfi park, Tartumaa, Estonia', '9 korviga discgolfi park ilusa Elva männimetsa all, mis sobib nii algajatele kui ka edasijõudnutele. Rajad erinevate pikkuste ja mandodega, mis muudavad mängimise piisavalt atraktiivseks kõigile.

Amenities: Peamaja hoones discgolf ketaste müük ja laenutus. Tervisespordikeskuses võimalik ööbida, pidada üritusi ja võistlusi ning kasutada muid vabaaja ja sportlikke tegevusi.', 58.206158, 26.4235971000001),
  ('emmaste-discgolfipark', 'Emmaste discgolfipark', 'Emmaste, Hiiumaa, Estonia', 'Algajasõbralik discgolfipark, mille radade keskmine pikkus on 50 meetrit.', 58.707107, 22.5880291),
  ('haademeeste-keskkooli-discgolfi-park', 'Häädemeeste Keskkooli discgolfipark', 'Häädemeeste Keskkooli, Pärnumaa, Estonia', null, 58.0781819, 24.4955819),
  ('haanja-discgolfipark', 'Haanja discgolfipark', 'Haanja, Võrumaa, Estonia', 'Haanja Puhke- ja Spordikeskuses asuv discgolfirada.

Amenities: Ketaste laenutus Mooska talus – 5032341, Pubi Finiš - Toitlustus, wc, saun', 57.7226926, 27.0484921),
  ('haapsalu', 'Haapsalu', 'Haapsalu, Läänemaa, Estonia', null, 58.9431712325881, 23.5803482058479),
  ('holstre-paradiis-discgolfipark', 'Holstre Paradiis discgolfipark', 'Holstre Paradiis, Viljandimaa, Estonia', 'Maalilise loodusega Paradiis Discgolfpark oma 18 rajaga kutsub mängima Viljandimaale Holstresse. Park on loodud Paradiisi Puhkemaja territooriumile pakkumaks ajaveetmisvõimalust kõigile soovijatele. Mängida saab iga päev va kui puhkemaja on broneeritud. Broneeringute koha näeb infot: www.holstreparadiis.ee

Fee: 5 €', 58.2749249, 25.6826362),
  ('holstre-polli-discgolfipark', 'Holstre-Põlli discgolfipark', 'Holstre-Põlli, Viljandimaa, Estonia', null, 58.283631833492, 25.665363156037),
  ('hummuli-discgolfi-park', 'Hummuli discgolfipark', 'Hummuli, Valgamaa, Estonia', 'Looduskauni Väikese-Emajõe kalda ääres kulgev 9-korviline discgolfi rada. Valdavalt metsakoridorides, aga on ka avaramaid viskeid.', 57.9062972222222, 26.0743944444444),
  ('iisaku-discgolfipark', 'Iisaku discgolfipark', 'Iisaku, Ida-Virumaa, Estonia', 'Iisaku Gümnaasiumi juures asuv discgolfipark.', 59.095264, 27.312013),
  ('ilmatsalu-discgolfipark', 'Ilmatsalu discgolfipark', 'Ilmatsalu, Tartumaa, Estonia', 'Ilmatsalu Noortekeskuse ümber paiknev 4-korviline discgolfirada', 58.390915, 26.554744),
  ('imavere-discgolfipark', 'Imavere discgolfipark', 'Imavere, Järvamaa, Estonia', 'Tegemist on harrastajasõbraliku rajaga, mis aga pakub põnevaid väljakutseid ka edasijõudnud mängijatele. On nii avatud alasid, kui ka erinevaid metsatunneleid.', 58.732528, 25.764),
  ('ingliste-lennurada-discgolfipark', 'Ingliste Lennurada discgolfipark', 'Ingliste Lennurada, Raplamaa, Estonia', 'Ingliste mõisapargis, Keila jõe kaldal asetsev 9 korviline discgolfipark. Kettaid võimalik laenutada Ingliste Raamatukogust mõne euro eest.', 59.0180858, 24.9459802),
  ('jarta-discgolfipark', 'Järta discgolfipark', 'Järta, Raplamaa, Estonia', 'Rapla maakonnas Märjamaal Järta terviseradadel paiknev 18 korviga rada.', 58.8973513, 24.4731122000001),
  ('jarva-jaani-discgolfipark', 'Järva-Jaani discgolfipark', 'Järva-Jaani, Järvamaa, Estonia', 'Kaheksateistkümne korviga kolme kilomeetri pikkune discgolfi rada harrastajatele Võllaste terviseradadel Järva-Jaanis Järvamaal.', 59.0339587, 25.8944803),
  ('jarvakandi-discgolfi-park', 'Järvakandi discgolfipark', 'Järvakandi, Raplamaa, Estonia', 'Järvakandi terviserajal asuv 18-korviga discgolfi park. Rada kulgeb mööda 3km jooksurada, mida ümbritseb männi- ja segamets. Rajal on kitsaid ning pikki metsavahe lõike, kui ka avaraid kohti, kus on võimalik pikkasid distantse visata. Mitmes kohas mängivad kõrguste vahed. Rajal on üks veetakistus. Rada on raskusastmelt pigem raske.

Amenities: Pesemisvõimalused Järvakandi võimlas - tasuline., Saun samas tellimise peale - tasuline., Ketaste laenutus, Ööbimine, kaks kohvikut alevis.', 58.7752859366413, 24.802494499414),
  ('jarve-discgolfipark', 'Epicbet Järve discgolfipark', 'Viljandi mnt 13d, Tallinn, Estonia', '.
Disc Golf Fanatics MTÜ
+372 53734097
info@discgolffanatics.com', 59.3769069170465, 24.7493136114339),
  ('jarve-talu', 'Järve Talu Aktiivpuhkekeskus', 'Järve talu, Nahkjala küla, Lääne-Harju vald, Harjumaa', 'Päevapilet: 3 €

FEUM OÜ
+372 5345 2464
kuidokungla@hotmail.com', 59.254694916716, 24.2860837542537),
  ('jogeva-discgolfipark', 'Jõgeva discgolfipark', 'Jõgeva discgolfi park, Jõgevamaa, Estonia', 'Jõgeval asuv mitmekesine avatud radadega ning samas ka kitsaste tunnelitega 9 korvoga discgolfipark.

Amenities: Ketaste laenutus Virtuse Spordihoones', 58.7447000071949, 26.3782945275307),
  ('joulumae-discgolfi-park', 'Jõulumäe discgolfipark', 'Jõulumäe, Pärnumaa, Estonia', 'Pärnu lähedal Jõulumäel asuvas discgolfi pargis on 3 rada, kollane, punane ja sinine. Sinisel rajal on 9 korvi ja mõeldud pigem algajatele. Rajale minnes kindlasti vaadata Jõulumäe spordikeskuse kodulehele ja veenduda, et seal parasjagu mingit suuremat sündmust ei ole toimumas.

Amenities: Majutus, Ketaste laenutus, WC', 58.223627, 24.5157340000001),
  ('kaagvere-discgolfipark', 'Kaagvere discgolfipark', 'Kaagvere, Tartumaa, Estonia', 'Lihtsad algajasõbralikud rajad Tartumaal.

Amenities: Kuivkäimla 4. tii-ala kõrval', 58.3461613952262, 26.891108751297),
  ('kaapa-discgolfi-park', 'Kääpa discgolfipark', 'Kääpa, Võrumaa, Estonia', 'Võrumaal Kääpas asuv 7 korviga discgolfi park.', 57.8669248516499, 27.1132010221481),
  ('kaarepere-discgolfi-park', 'Kaarepere discgolfipark', 'Kaarepere, Jõgevamaa, Estonia', 'Mõnus ja alati hästi hooldatud park Jõgevamaal Kaareperes, mille rajad kulgevad piki mäeveergu või siis ülesse-alla.', 58.6586609128916, 26.49937748909),
  ('kadrina-discgolfi-park', 'Kadrina discgolfipark', 'Kadrina, lääneviru, Estonia', null, 59.3447784701815, 26.1271905569389),
  ('kaina-discgolfipark', 'Käina discgolfipark', 'Käina, Hiiumaa, Estonia', 'Algajasõbralik, kuid samas mitmekülgne discgolfipark Käina kooli lähedal.', 58.8315788, 22.7797544),
  ('kaiu-discgolfipark', 'Kaiu discgolfipark', 'Kaiu, Raplamaa, Estonia', 'Raplamaal Kaiu alevikus paiknev 19 korviga discgolfipark

Amenities: Pargist 100m kaugusel on kohali COOP pood, kust saab söögipoolist ning kasutada ka WC-d.', 59.013535, 25.049399),
  ('kaldamae-discgolfipark', 'Kaldamäe discgolfipark', 'Kaldamäe, Võrumaa, Estonia', 'Eravaldusel asuv discgolfipark maalilises Kütiorus. Mitmekülgsete radadega, kus leiab nii metsakoridore, lagedaid radu, millel erinevad pikkused ning suured kõrguste vahed.

Fee: 3 €', 57.79839, 27.148291),
  ('kalmetu-kooli-discgolfipark', 'Kalmetu kooli discgolfipark', 'Kalmetu kooli, Viljandimaa, Estonia', 'Algaja sõbralik discgolfi park Tänassilmas Kalmetu kooli ümbruses.', 58.3896346, 25.8403573),
  ('karujarve-discgolfipark', 'Karujärve discgolfipark', 'Karujärve, Saaremaa, Estonia', '24 korviline rada Saaremaal Karujärvel, A ja B tiialadega.', 58.4075687691827, 22.1880269050598),
  ('kehra-discgolfi-park', 'Kehra discgolfipark', 'Kehra discgolfi park, Harjumaa, Estonia', 'Park sobib hästi algajatele ja lastele. Park asub looduskaunis kohas, Jägala jõe ääres.

Amenities: Parkla, Ujumiskoht, Süüa saab Kohvik Sohvikust', 59.3300473, 25.3394372),
  ('kehtna-discgolfipark', 'Kehtna discgolfipark', 'Kehtna, Raplamaa, Estonia', 'Kehtna 9-korviline Roheline Rada', 58.924588341079, 24.869008914819),
  ('keila-discgolfpark', 'Keila discgolfpark', 'Keila, Harjumaa, Estonia', null, 59.31622, 24.388013),
  ('kellavere-discgolfi-park', 'Kellavere discgolfipark', 'Kellavere, lääneviru, Estonia', 'Laekvere vallas, Kellavere mäel asuv DiscSport.ee poolt loodud 9 korviga DiscGolfPark.', 59.0738830750022, 26.5243944236817),
  ('kergu-discgolfipark', 'Kergu discgolfipark', 'Kergu, Pärnumaa, Estonia', 'Algajasõbralik 6 korviga discgolfirada Kergu Kooli kõrval.', 58.681053125686, 24.761581805943),
  ('kernu-discgolfi-park', 'Kernu discgolfipark', 'Kernu, Harjumaa, Estonia', null, 59.1345746103213, 24.4956353206237),
  ('keskus-suvi-discgolfipark', 'Keskus Suvi discgolfipark', 'Keskus Suvi, Ida-Virumaa, Estonia', 'Puhkekeskuse territooriumil asuv tasuline discgolfipark.

Fee: Raja kasutus 5€ koos ketaste laenutusega (ilma 3€) €', 59.0106627, 27.4983379),
  ('kihnu-discgolfi-park', 'Kihnu discgolfipark', 'Kihnu, Pärnumaa, Estonia', null, 58.143735, 24.013849),
  ('kiikla-discgolfi-park-libahunt', 'Kiikla discgolfipark', 'Kiikla, Ida-Virumaa, Estonia', 'Park asub Kiikla asulas ja on mõeldud pigem algajatele, kes veel nii pikki viskeid ei soorita. Pigem avatud park üksikute puudega.

Amenities: Lähedal pood', 59.2793113883237, 27.2364914417267),
  ('kilingi-nomme-discgolfipark', 'Kilingi-Nõmme discgolfipark', 'Kilingi-Nõmme, Pärnumaa, Estonia', 'Pärnust ainult poole tunni autosõidu kaugusel Kilingi-Nõmmel asuv üheksa korviga discgolfi rada.', 58.1522636925281, 24.9521318761963),
  ('kivioli-seikluskeskuse-discgolfi-park', 'Kiviõli Seikluskeskuse discgolfipark', 'Kiviõli Seikluskeskuse, Ida-Virumaa, Estonia', 'Kiviõli Seikluskeskuse discgolfpark on alustavale ja vahest ka veidi mänginud discgolfarile täpselt paras. Mitte väga raske, samas ka mitte kõige lihtsam. Edasijõudnud mängijatele pigem selline kerge jalutuskäik. Praegune uus asetus, "Black Rabbit", on väga sarnane eelmisele. Ohutuse mõttes mõned muudatused juures.

Amenities: Mäe põhja poolsel küljel talvel suusamägi, suvel kogupere elamuspark www.seikluskeskus.ee, Majutus, Kohvik', 59.3613889, 26.9454547),
  ('kohila', 'Kohila discgolfipark', 'Kohila, Raplamaa, Estonia', null, 59.17241, 24.763018),
  ('kohtla-jarve-discgolfipark', 'Kohtla-Järve discgolfipark', 'Kohtla-Järve, Ida-Virumaa, Estonia', '18 korviline discgolfipark ilusas Kohtla-Järve rahvapargis. Mõnus jalutuskäik igal tasel mängija jaoks.', 59.398644, 27.273892),
  ('kohtla-nomme-discgolfipark', 'Kohtla-Nõmme discgolfipark', 'Kohtla-Nõmme, Ida-Virumaa, Estonia', null, 59.3500033, 27.1740359),
  ('koigi-discgolfipark', 'Koigi discgolfipark', 'Koigi, Järvamaa, Estonia', 'Esimesed 1-9 rada kulgevad pargis, rajad 10-18 on metsa all.', 58.833333, 25.748944),
  ('kolga-jaani-discgolfi-park', 'Kolga-Jaani discgolfipark', 'Kolga-Jaani, Viljandimaa, Estonia', null, 58.5327036350034, 25.9450709899353),
  ('koosa-discgolfi-park', 'Koosa discgolfipark', 'Koosa discgolfi park, Tartumaa, Estonia', 'Amenities: Kõrval asub kauplus A&O', 58.5261478916258, 27.0738473494598),
  ('korvemaa-discgolfipark', 'Sportland Kõrvemaa discgolfipark', 'Sportland Kõrvemaa, Harjumaa, Estonia', 'Sportland Kõrvemaa Matka- ja Suusakeskuses ootavad sind põnevad discgolfi rajad igale vanusele ja igale mängijale. Keskusest saab alguse 1 – 18 korviga Sportland Kõrvemaa harrastajate rada ning väljakutsuvam 21 korviga Prodigy Kõrvemaa rada. Rajad on mitmekülgsed ja sobivad nii algajale, harrastajale kui ka kogenenud mängijale. Rajatasu 3,5€ inimene- tasumine kohvikus või mobiiliga. Mobiiliga tasumise juhis rajakaardi juures. Keskuses on müügil ka hea valik discgolfi varustust. Samuti saab varustust rentida. Kontaknumber: 5246628 Kodulehelkülg: www.sportlandkorvemaa.ee

Fee: 3.5 €

Amenities: Kohvik, Ketaste müük, Majutus', 59.3177, 25.6527),
  ('kose-discgolfi-park', 'Kose discgolfipark', 'Kose, Harjumaa, Estonia', 'Kose tervise ja suusarajal asuv rada. Pigem raskemapoolne, on nii metsaradu kui ka avatud maastikul olevaid radasid.', 59.1900886, 25.1693287),
  ('kullamaa-discgolfi-park', 'Kullamaa discgolfipark', 'Kullamaa discgolfi park, Läänemaa, Estonia', 'Männimetsas asuv tehniline park.', 58.8888914, 24.0589413),
  ('kunda-discgolfipark', 'Kunda discgolfipark', 'Kunda, lääneviru, Estonia', null, 59.5008779910135, 26.5137535544922),
  ('kuremae-discgolfi-park', 'Kuremäe discgolfipark', 'Kuremäe discgolfi park, Ida-Virumaa, Estonia', null, 59.19575, 27.5361093),
  ('kurna-discgolfipark', 'Kurna discgolfipark', 'Kurna, Harjumaa, Estonia', null, 59.339132, 24.843053),
  ('kuusalu-keskkooli-rihumae-discgolfipark', 'Kuusalu Keskkooli Rihumäe discgolfipark', 'Kuusalu Keskkooli Rihumäe, Harjumaa, Estonia', 'Kuusalu Spordikeskuse ja Keskkooli discgolfipark', 59.451821878739, 25.418683062741),
  ('kuutsemae-discgolfipark', 'Kuutsemäe discgolfipark', 'Kuutsemäe discgolfi park, Valgamaa, Estonia', 'Must 18-korviga PRO-rada, mis on oma tõusude ja langustega tõsine väljakutse ka kogenud discgolfarile. Pikad avadraivid, täpne vise, tugev vaimne võitlus ja hea füüsiline vorm on see, mis annavad mängijale antud rajal eelise. Mitmed PAR4d, üks PAR5, 90m vise üle tehisjärve ja ca 250m 17. rada ülevalt mäenõlvalt alla orgu pakuvad adrenaliini rohkem ja veel. Ka algajatele on mõeldud, pargis on veel eraldi kergemad asetused, vastavalt siis Punane ja Roheline rada.', 58.0259363988, 26.3218542327882),
  ('laaneotsa-discgolfipark', 'Koeru Laaneotsa discgolfipark', 'Koeru Laaneotsa, Järvamaa, Estonia', 'Keskmise raskusastmega. Sobib hästi mängijatele, kes soovivad harjutada tunneliviskeid ja täpsust.', 58.965915237197, 26.001234460669),
  ('laulasmaa-discgolfi-park', 'Laulasmaa discgolfipark', 'Laulasmaa, Harjumaa, Estonia', 'Laulasmaa Spa ümber paiknev 9 korviga DiscGolfPark, mis tehtud DiscSport.ee poolt.', 59.3757363705377, 24.237277507782),
  ('lihula-moisamae-discgolfipark', 'Lihula Mõisamäe discgolfipark', 'Lihula Mõisamäe, Pärnumaa, Estonia', 'Pargiraja kergem asetus. OB''d on asfaltkattega teede mänguala poolne serv ja naaberkinnistute piirdeaiad.', 58.6932184, 23.8383574),
  ('liipa-talu-discgolfipark', 'Liipa Talu discgolfipark', 'Liipa Talu, Harjumaa, Estonia', 'Liipa Talu discgolfipark on 12-korviga harrastajasõbralik rada, mis sobib nii alustavale mängijale discgolfiga tutvumiseks kui ka edasijõudnud mängijale täpsuse treenimiseks ja lähenemiste harjutamiseks. Tiialadel on korralikud kunstmurukatted hea haarduvuse saavutamiseks ning korvideks kasutame Rootsi tippbrändi Trainer discgolfikorve. Mitmel korvil on kohustuslikud rajapunktid ehk “mandod”, mis annavad lisaraskust. Korvideni jõudmiseks on nii eestkäe- kui ka tagakäeliinid – mida suurem on viskearsenal, seda kindlakäelisemalt on võimalik võtta ka “birdiesid” ehk läbida korv kahe viskega. Discgolfipargis on mitmeid väljakutseid, et muuta ringi läbimine veelgi põnevamaks. Pool Liipa Talu discgolfipargist asub lagedal ning on kohati tuuline, teine osa aga metsatukas, kus kitsad koridorid ja täpsus on esmatähtis.

Fee: 2 €', 59.4188701, 24.9818932),
  ('lindi-discgolfipark', 'Lindi discgolfipark', 'Lindi, Pärnumaa, Estonia', 'Lindi Vana Kooli kohviku juures asuv 9 korviga discgolfipark.

Amenities: Kohvik', 58.335372287112, 24.255994982803),
  ('linnamae-discgolfi-park', 'Linnamäe discgolfipark', 'Linnamäe, Läänemaa, Estonia', 'Piisavalt tehnilised lühikesed rajad. Korralikult hooldatud.

Amenities: Parkla asub raja lähedal vana vallamaja ees.', 58.9964859755653, 23.7198784239538),
  ('lohusuu-discgolfipark', 'Lohusuu discgolfipark', 'Lohusuu, Jõgevamaa, Estonia', null, 58.9525534, 27.0453645),
  ('lumanda-discgolfipark', 'Lümanda discgolfipark', 'Lümanda, Saaremaa, Estonia', 'Lümanda discgolfipark on 9 korviga rada, mis läbib Lümanda parki, vana vallamaja hoovi, staadioni ja jooksurada. Rada koosneb erinevatest elementidest ning on läbimispikkuselt umbes 1,5 km.', 58.286171616337, 22.025277632788),
  ('maardu', 'Maardu discgolfipark', 'Maardu, Harjumaa, Estonia', null, 59.463366, 25.004581),
  ('maarjamae-discgolfipark', 'Maarjamäe discgolfipark', 'Maarjamäe discgolfi park, Harjumaa, Estonia', 'Tallinna kesklinnast kümne minuti kaugusel asuv 10 korviga meeldiv vahepala päevitamisele Pirita rannas. Soovitatav algajatele', 59.4525246544601, 24.8473405838013),
  ('maemoisa-discgolfi-park', 'Mäemõisa discgolfipark', 'Mäemõisa, Läänemaa, Estonia', 'Mõisa pargis 9 korvine rada, suhteliselt tehniline, aga radade pikkused sobivad ka algajatele.', 58.8313815, 23.5849736),
  ('maeotsa-discgolfipark', 'Mäeotsa discgolfipark', 'Mäeotsa, Põlvamaa, Estonia', 'Erapark Põlvamaal - avatud ja metsa sees olevad korvid umbes pooleks. Erineva variatsiooniga ja looduskaunis park koos veetakistustega. Enne mängimist kindlasti kokku leppida raja omanikuga/haldajaga! Talvel puuduvad suurem osa korve.

Fee: 5 €', 58.0313497000327, 27.0430612564087),
  ('maetaguse-discgolfipark', 'Mäetaguse discgolfipark', 'Mäetaguse discgolfi park, Ida-Virumaa, Estonia', 'Ida-Virumaal Mäetagusel 18 korviga rajal on peetud ka mitmed Eesti Meistrivõistlustest, mis oma raskuse all võib murda nii mõnegi visa võitleja.', 59.2253959327449, 27.2787313623352),
  ('mammaste-discgolfi-park', 'Mammaste discgolfipark', 'Mammaste, Põlvamaa, Estonia', 'Põlvamaal Mammastes asuv 18 korviga discgolfi park.

Amenities: Majutus, Saun', 58.0773656901814, 27.0656561851501),
  ('mandjala-discgolfi-park', 'Mändjala discgolfipark', 'Mändjala, Saaremaa, Estonia', 'Park asub Mändjala Kämpingus kaunis männikus liivaluidetel Mändjala rannas mere ääres. Suve hooajal saab mängimiseks kettaid laenutada rannabaarist Manjaana. Rada on kõikidele tasuta kasutamiseks aastaringselt.', 58.216, 22.3321999),
  ('manniku-wakepark', 'Männiku Wakepark', 'Saku, Männiku, Harjumaa, Estonia', null, 59.331007, 24.689243),
  ('marjamaa-discgolfipark', 'Märjamaa discgolfipark', 'Märjamaa, Raplamaa, Estonia', 'Rada asub kooli kõrval enamjaolt avatud väljakul. Radade pikkused on vahemikus 48 kuni 90 meetrit ning seal on erinevaid mandosid, OB-sid ja üks saare rada.', 58.9055, 24.424917),
  ('metsajoe-discgolfi-park', 'Metsajõe discgolfipark', 'Metsajõe, Järvamaa, Estonia', 'Fee: 2 €', 58.758828, 25.339463),
  ('metsapoole-discgolfi-park', 'Metsapoole discgolfipark', 'Metsapoole discgolfi park, Pärnumaa, Estonia', 'Rada kulgeb ümber põhikooli hoonete, üle selle staadioni ja läbi lähedalasuva metsatuka.', 57.904144, 24.3762998),
  ('moedaku-puhkebaasi-discgolfi-park', 'Mõedaku puhkebaasi discgolfipark', 'Mõedaku puhkebaasi discgolfi park, lääneviru, Estonia', 'Mõedaku Spordibaasis Rakvere külje all asuv 9-korviline Disgolfi park. Esimesed kolm rada looklevad maalilistel muruväljadel, künklikul maa-alal. Neljas kuni kaheksas rada kulgevad ca 10 meetri laiusel metsateel, künklikul maa-alal. 9 rada kulgeb allamäge pikal mäesuusanõlval

Amenities: Majutus, Toitlustus, Saun', 59.3274321986542, 26.5802192687988),
  ('moisakula-discgolfipark', 'Mõisaküla discgolfipark', 'Mõisaküla, Viljandimaa, Estonia', '13 korviga, alustava mängija sõbralik rada Viljandimaal.', 58.0929974016475, 25.1701927185059),
  ('muhu-discgolfi-park-liiva', 'Muhu discgolfipark', 'Muhu, Saaremaa, Estonia', '6 korviga DiscGolfPark, mis loodud DiscSport.ee poolt. 6 rajaline discgolfi harrastajatele mõeldud park Muhus, mis oma lühikeste rajapikkustega on sobilik ka algajatele.', 58.6019904801466, 23.2265913857055),
  ('muraste', 'Muraste discgolfipark', 'Muraste, Harjumaa, Estonia', null, 59.456446, 24.47448),
  ('mustla-discgolfi-park', 'Mustla discgolfipark', 'Mustla, Viljandimaa, Estonia', null, 58.2311550692347, 25.8730280399323),
  ('musumanniku-discgolfi-park', 'Musumänniku discgolfipark', 'Musumänniku, Saaremaa, Estonia', 'Saaremaal Kuressaare külje all Musumänniku terviseradadel paiknev 18 korviga discgolfi park, kuid on võimalus teha ka vana 12 korvilist ringi.', 58.2462380299004, 22.4558642506599),
  ('naissaare-discgolfipark', 'Naissaare discgolfipark', 'Naissaare discgolfi park, Harjumaa, Estonia', 'Naissaare disc golfi park on 2015. aastal loodud 9-korviga rada, mis on eelkõige mõeldud algajale, kuid nõuab head kätt ka professionaalilt. Pargi teeb eriliseks selle asukoht ja kvaliteet. Radadel on 4x2m kunstmuruga kaetud viskealad ja 9 DisCatcher Pro korvi. Park paikneb saare lõunapoolsel rannaribal, kust väikse jalutuskäigu kaugusel on ka külalistemaja. Oma varustuse puudumisel on meie enda kettaid võimalik laenutada ning samuti kaasa osta Naissaare sadamapoest, kust leiab ka lisainfot pargi täpsema asukoha kohta.', 59.5386368921547, 24.5473945140839),
  ('noo-discgolfi-park', 'Nõo discgolfipark', 'Nõo, Tartumaa, Estonia', 'Tartumaal Nõos asuv 12 korviga discgolfi park.

Amenities: Ketaste laenutus ja müük', 58.272366356362, 26.5219831466675),
  ('noo-reaalgumnaasiumi-discgolfipark', 'Nõo Reaalgümnaasiumi discgolfipark', 'Nõo Reaalgümnaasiumi, Tartumaa, Estonia', 'Nõo Kooli juures paiknev discgolfi õpperada', 58.2799, 26.53806),
  ('nova-discgolfipark', 'Nõva discgolfipark', 'Nõva, Läänemaa, Estonia', null, 59.231773, 23.674513),
  ('olustvere-discgolfipark', 'Olustvere discgolfipark', 'Olustvere, Viljandimaa, Estonia', null, 58.5556588, 25.5668743),
  ('oru-discgolfipark', 'Õru discgolfipark', 'Õru, Valgamaa, Estonia', 'Legendaarne, pika ajalooga ning mõnusa vaibiga discgolfipark Õru-s.', 57.9269656, 26.1807095),
  ('osula-discgolfi-park', 'Osula discgolfipark', 'Osula, Võrumaa, Estonia', 'Võrus, Osula Põhikooli lähedal asuv 9 korviga discgolfi park.', 57.8843699586137, 26.825762155156),
  ('pagari-discgolfipark', 'Pagari discgolfipark', 'Pagari, Ida-Virumaa, Estonia', 'Lühikesed rajad seltsimaja pargis.', 59.260002453593, 27.382176635582),
  ('paide-ulejoe-discgolfipark', 'Paide Ülejõe discgolfipark', 'Paide Ülejõe, Järvamaa, Estonia', '9 korviga discgolfi park Kesk-Eestis, Paide linna serval. Sobilik nii algajatele kui harrastajatele.', 58.8774672218256, 25.5767619609833),
  ('paikuse-discgolfi-park', 'Paikuse discgolfipark', 'Paikuse, Pärnumaa, Estonia', 'DiscSport.ee poolt rajatud discgolfi park Pärnumaal Paikusel. Pargis on 9 korvi ning keskmine raja pikkus on 60 meetrit, rajad sobivad ka algajatele.

Amenities: Majutus, Saun', 58.3609210700308, 24.6058130264282),
  ('pala-discgolfirada', 'Pala discgolfirada', 'Pala, Jõgevamaa, Estonia', null, 58.6716976, 27.0145729),
  ('palade-discgolfipark', 'Palade discgolfipark', 'Palade, Hiiumaa, Estonia', '2020. aastal avatud 18 korviga harrastajasõbralik discgolfipark. Parkimine Palade kooli juures.', 58.962975594554, 22.845726683736),
  ('paldiski-discgolfi-park', 'Paldiski discgolfipark', 'Paldiski discgolfi park, Harjumaa, Estonia', 'Paar rada suuremate kõrguste vahedega, enamjaolt lühikesed ja sobivad ka algajatele.', 59.355972, 24.048611),
  ('palivere-discgolfipark', 'Palivere discgolfipark', 'Palivere, Läänemaa, Estonia', 'Hea mõnus 18 korviga discgolfi rada, mis jääb ilusti Haapsalu tee peale, kui suvel päevitama ja ujuma minna. Lisaks punasele rajale on võimalik mängida ka veel natuke lihtsamaid ja lühemaid sinist ning kollast rada.', 58.9708360063986, 23.9151531455993),
  ('parnjoe-discgolfipark', 'Pärnjõe discgolfipark', 'Pärnjõe, Pärnumaa, Estonia', 'Pärnjõe Kooli territooriumil paiknev algajasõbralik 6 korviga discgolfirada.', 58.628478426955, 24.924053452709),
  ('parnu-jaagupi-discgolfi-park', 'Pärnu-Jaagupi discgolfipark', 'Pärnu-Jaagupi discgolfi park, Pärnumaa, Estonia', null, 58.6100904424141, 24.5001074576721),
  ('parnu-joekaaru-discgolfipark', 'Pärnu Jõekääru discgolfipark', 'Pärnu Jõekääru, Pärnumaa, Estonia', 'Pärnu linna vahetus läheduses jõeäärne 18 korviga discgolfipark pigem edasijõudnutele, keskmine radade pikkus on üle 100m. Suviti on palju grilli ja puhkuse inimesi, seega ettevaatust!

Amenities: Välikäimla, Ujumise võimalus suvel, Grillimise ala, Parkimine', 58.3768615661711, 24.5556020736694),
  ('parnu-raekula-discgolfipark', 'Pärnu Raeküla discgolfipark', 'Pärnu Raeküla, Pärnumaa, Estonia', 'Pärnus Raeküla linnaosas, Reiu metsas asuv 19 korviga ning soojendusalaga Pro & Amatööride asetusega discgolfipark.', 58.3596724, 24.5865638),
  ('paunkula-discgolfi-park', 'Paunküla discgolfipark', 'Paunküla, Harjumaa, Estonia', 'Chilli Disc Golfi klubi liikmete poolt disainitud ja rajatud discgolfi park Paunkülas. Park koosneb 18 rajast, mis on paigutatud metsa vahele.

Amenities: Majutus, Saunad, Toitlustus', 59.1147193957502, 25.383095741272),
  ('pikasilla-discgolfi-park', 'Pikasilla discgolfipark', 'Pikasilla discgolfi park, Valgamaa, Estonia', 'Looduskaunil Pikasilla puhkealal kulgev 9-korviline discgolfirada. Valdavalt parkmetsas, aga on ka mitu pikemat avarat viset.', 58.0920583333333, 26.0497833333333),
  ('pirgu', 'Pirgu discgolfipark', 'Pirgu, Raplamaa, Estonia', null, 59.111053, 24.823458),
  ('pisisaare-discgolfipark', 'Pisisaare discgolfipark', 'Pisisaare, Jõgevamaa, Estonia', null, 58.721913995903, 25.959708026538),
  ('piusa-urgoru-discgolfipark', 'Piusa Ürgoru discgolfipark', 'Piusa Ürgoru, Võrumaa, Estonia', 'Piusa Ürgoru maastikukaitseala äärel asuv disc golf park, hetkel 9 korvi.

Amenities: Piusa Ürgoru Puhkemajas saab vajadusel ööbida ja ka süüa.', 57.7737337255128, 27.3751294612885),
  ('poide-discgolfipark', 'Pöide discgolfipark', 'Pöide, Saaremaa, Estonia', 'Saaremaal Pöide terviserajal asuv 9 korviga disgolfipark', 58.5070242798861, 23.0578780174255),
  ('poltsamaa-kuningamae-discgolfipark', 'Põltsamaa Kuningamäe discgolfipark', 'Põltsamaa Kuningamäe, Jõgevamaa, Estonia', 'Põltsamaal Kuningamäel asub 18 korviga discgolfi rada, kus peab oskusi näitama nii pikematel visetel, kui ka lähestumistel. On avatud radu, metsavahelisi tunneleid, veekogu ja OB-saared. Sobib edasijõundutele ja algajatele.', 58.647811, 25.960901),
  ('puhalepa-discgolfipark', 'Pühalepa discgolfipark', 'Pühalepa, Hiiumaa, Estonia', 'Hiiumaal, Pühalepal asuv 19 korviga ning kahe asetusega discgolfi rada. Punane-asetus edasijõudnutele ning Sinine-asetus rohkem harrastajatele suunatud.', 58.9884007, 22.8051691),
  ('raama-discgolfi-park', 'Rääma discgolfipark', 'Rääma, Pärnumaa, Estonia', 'Pärnu linnasisene discgolfi park, mis oma 9 korviga on pigem suunatud algajatele, kuid pakub mängurõõmu ka edasijõudnutele.', 58.3935820616312, 24.5099025964737),
  ('rakke-discgolfi-park', 'Rakke discgolfipark', 'Rakke, lääneviru, Estonia', 'Lääne-Virumaal Rakkes asuv 9 korviga DiscGolfPark, mis loodud DiscSport.ee poolt.', 58.9804201351695, 26.2551337724915),
  ('rakvere-discgolfi-park', 'Rakvere discgolfipark', 'Rakvere, lääneviru, Estonia', null, 59.336947, 26.377923),
  ('randmae-sportland-discgolfipark', 'Randmäe Sportland discgolfipark', 'Randmäe Sportland, Hiiumaa, Estonia', 'Silmailu pakkuv rada, mis asub Hiiumaal, Randmäe puhketalus mere vahetus läheduses. Discsport Star korvid, kunstmuru tiialad. Rajatüüp – pool metsa/pool parki, veetakistustega.', 59.0311982175894, 22.5794577598572),
  ('rannapargi-discgolfipark', 'Rannapargi discgolfipark', 'Rannapargi, Pärnumaa, Estonia', '2026 aasta Rannapargi Open layout. 21 väljakutsuvad pop-up discgolfirada.

Amenities: Välikäimla', 58.380385325912, 24.489394287634),
  ('rannu-kooli-discgolfipark', 'Rannu kooli discgolfipark', 'Rannu kooli, Tartumaa, Estonia', 'Rannu kooli juures asuv 9-korviline discgolfipark', 58.23973, 26.219072),
  ('rapina-discgolfi-park', 'Räpina discgolfipark', 'Räpina, Põlvamaa, Estonia', 'Discgolfi rada 9 korviga Räpinas Võhandu jõe ääres. Enamuses avatud ala, lisaks natuke parki ja kõrguste erinevusi rajal.', 58.0927941173122, 27.4651436550171),
  ('respo-discgolfipark', 'Respo discgolfipark', 'Respo, Tartumaa, Estonia', 'Respo discgolfipargis on 18 korviga rada.', 58.3286954, 26.7029791),
  ('rongu-discgolfipark', 'Rõngu discgolfipark', 'Rõngu, Tartumaa, Estonia', '6 korviline discgolfirada Rõngu Keskkooli territooriumil.', 58.149016, 26.246389),
  ('roodevalja-discgolfipark', 'Roodevälja discgolfipark', 'Roodevälja, lääneviru, Estonia', 'Roodevälja väike 9-korviline discgolfirada', 59.365206275418, 26.373426127873),
  ('roosta-puhkekula-discgolfipark', 'Roosta Puhkeküla discgolfipark', 'Roosta Puhkeküla, Läänemaa, Estonia', 'Roosta Puhkeküla disc golfi rada koosneb 9 korvist, mis kulgevad paralleelselt rannaga. Maastiku teeb põnevaks liivakünkad ning männimets.

Fee: 3 ketast / 3 tundi 5€ €', 59.1583131, 23.5197243),
  ('rummu-discgolfipark', 'Rummu discgolfipark', 'Rummu, Harjumaa, Estonia', 'Rummu karjääris asub 12 korviga alustavale mängijale sobilik discgolfipark.

Fee: 5 €

Amenities: Rand karjääri ääres, Riietuskabiinid, Rannakohvik erinevate karastavate jookide, jäätise ja toitudega (suvehooajal), Riiuliraamatukogu millelt saad päevaks lugemist laenutada (suvehooajal), Telkimisala, Veepark (suvehooajal), Ujumisvõimalus omal vastutusel, Matk mäkke omal vastutusel, Võimalus osa võtta Murru vangla ekskursioonist', 59.2273404, 24.196036),
  ('saarepeedi-discgolfi-park', 'Saarepeedi discgolfipark', 'Saarepeedi, Viljandimaa, Estonia', 'Viljandimaal Saarepeedi karjääri ja kooli juures lihtne harrastajatele mõeldud discgolfi rada. Rada on 50/50 avatud ja männimetsas. Autoteed, terviserada ja järv on mängust väljas ala ehk OB.

Amenities: 7.ndal rajal WC.', 58.4284859973662, 25.6859666497376),
  ('saku-discgolfi-park', 'Saku discgolfipark', 'Saku, Harjumaa, Estonia', 'Harjumaal Sakus olev 18 korviga avatud ning mitmete veetakistustega discgolfi park.', 59.2963854714919, 24.6663343906403),
  ('salme-discgolfipark', 'Salme discgolfipark', 'Salme, Saaremaa, Estonia', 'Salme discgolfi park algab Viking Burgeri kõrval Suure Tõllu raiesmaal. Mängimiseks on 18 korvi, tiialad on kaetud kunstmuruga. 1561 m pikkune rada pakub Sulle võimalust võidelda lagendikel tuulega, tabada männikus metsakoridori ning visata üle Salme jõe, mida mööda viikingid muistsel aal Salmele jõudsid. Rada on avatud mängimiseks kõigile tasuta, aga kettad võta ise kaasa! Salme rannapargi atmosfäär on saarelikult mõnus - meri ja kadakad. Sind ootab värske liivaga kaetud rannavõrkpalliväljak, laste mänguväljak, Salme legendaarne karussellkiik kui ka uhiuus külakiik. Salmel on kena!', 58.164965013417, 22.251295307471),
  ('sauga-discgolfipark', 'Sauga discgolfipark', 'Sauga, Pärnumaa, Estonia', 'Sauga discgolfi park on Pärnu linnapiiril olev 9-korviline rada, mille kogupikkus on 551m. Rajad on üsna lühikesed ja sobivad hästi alustavale mängijale. Rajad on üldiselt ääristatud kraavidega ning kohati puuduvad sillad jõudmaks järgmisele tiialale. Pargi kõrval puudub parkimine.', 58.4237763, 24.491041),
  ('simuna-discgolfipark', 'Simuna discgolfipark', 'Simuna, lääneviru, Estonia', 'Simunas asuv 18-korviline discgolfipark. Esimene pool rajast pargis, teine pool valdavalt avatud visked.', 59.0453382, 26.3987082),
  ('sindi-discgolfi-park', 'Sindi discgolfipark', 'Sindi, Pärnumaa, Estonia', 'Harrastajasõbralik pargirada. Vaheldusrikas - on lagedat, on tunneleid, on nii värava- kui saarerada, kergeid tõuse ja langusi, aga ka üle oru viskeid.', 58.40168523402, 24.640979264733),
  ('someru-discgolfi-park', 'Sõmeru discgolfipark', 'Sõmeru, lääneviru, Estonia', 'Rakvere lähedal, Sõmeru alevikus asuv 9 korviga algaja sõbralik discgolfi park.', 59.3597273686228, 26.4171355962753),
  ('sportland-prodigy-elva-discgolfi-park', 'Sportland Prodigy Elva discgolfipark', 'Sportland Prodigy Elva, Tartumaa, Estonia', 'Elvas Mahlamäel asuv 18 korviga Sportland Prodigy Discgolfipark, kuhu on oodatud kõik, kellele vähegi meeldib discgolfi mängida, aga ka need, kes seda veel proovinud ei ole.

Amenities: Elva EMV 2022 Caddy Book', 58.2275146720314, 26.4440059661865),
  ('suure-jaani-discgolfi-park', 'Suure-Jaani discgolfipark', 'Suure-Jaani, Viljandimaa, Estonia', 'Suure-Jaani paisjärve juures asuv 9 korviga rada.', 58.5344848702211, 25.4707717895508),
  ('tamsalu-discgolfi-park', 'Tamsalu discgolfipark', 'Tamsalu discgolfi park, lääneviru, Estonia', 'Tamsalu terviseradadel asuv keskmisest pisut raskem vaheldusrikas 18-korviline park. Esineb nii mandosid, keerukaid ob-alasid, lageda väljaga üle 150 meetriseid draive kui ka kitsaid 70-meetriseid metsaradu.', 59.1686157986918, 26.1044490337372),
  ('tapa-mannikumae-discgolfipark', 'Tapa Männikumäe discgolfipark', 'Tapa Männikumäe discgolfi park, lääneviru, Estonia', '18-korviline park, mis asub Tapa linna piiril Männikumäel.', 59.2593329, 25.9370078),
  ('tartu-roosi-discgolfi-park', 'Tartu Roosi discgolfipark', 'Tartu Roosi, Tartumaa, Estonia', null, 58.3931764, 26.7470177),
  ('tartu-tahtvere-dendro-discgolfi-park', 'Tartu Tähtvere Dendro discgolfipark', 'Tartu Tähtvere Dendro, Tartumaa, Estonia', 'Peaaegu Tartu kesklinnas, Tähtvere spordipargis asuv 18 korvline discgolfipark.', 58.3906243540181, 26.7003393173218),
  ('tehvandi-discgolfipark', 'Tehvandi discgolfipark', 'Tehvandi, Valgamaa, Estonia', 'Vaheldusrikas ja mägine Tehvandi on põnev park nii harrastajatele, kui edasijõudnutele.

Amenities: Ketaste laenutus (staadionihoones, E–P 11.00–17.00), Kohvik (staadionihoones, E–P 11.00–17.00), WC', 58.0493351214869, 26.5042591094971),
  ('terminal-oil-annikoru-discgolfipark', 'Terminal Oil Annikoru discgolfipark', 'Terminal Oil Annikoru, Tartumaa, Estonia', 'Tartu maakonnas asuv Annikoru 18 rajaga discgolfipark pakub pinget nii algajale kui ka edasijõudnutele.', 58.2644297, 26.307959),
  ('toosikannu-discgolfipark', 'Toosikannu discgolfipark', 'Toosikannu, Järvamaa, Estonia', 'Toosikannu 1 km. pikkusel discgolfi rajal on 9 korvi, radade kogupikkus on 622 meetrit ja kõikide radade PAR on 3. Kohapeal olemas 45 paari kettaid. Olemas ka online registreerimine - https://bouk.io/booking/toosikannu/341/rooms/90

Fee: 3 €', 58.8079689, 25.0704705),
  ('tori-discgolfi-park', 'Tori discgolfipark', 'Tori, Pärnumaa, Estonia', 'Pärnumaal Tori koolipargis olev 6-korviline discgolfi park on väga algaja sõbralik.', 58.4765776724626, 24.7982883453369),
  ('torva-discgolfi-park', 'Tõrva discgolfipark', 'Tõrva discgolfi park, Valgamaa, Estonia', 'Looduslik 18-korviga park, mis algab Tõrva Gümnaasiumi kõrvalt. Parkimine suures parklas. Rada peamiselt metsaradadel, aga on ka avaramaid viskeid.', 58.0065555555556, 25.9266027777778),
  ('tostamaa-discgolfi-park', 'Tõstamaa discgolfipark', 'Tõstamaa, Pärnumaa, Estonia', null, 58.3439148169074, 23.9960074424744),
  ('tudulinna-discgolfipark', 'Tudulinna discgolfipark', 'Tudulinna, Ida-Virumaa, Estonia', null, 59.0374042, 27.0854905),
  ('tuhalaane-discgolfi-park', 'Tuhalaane discgolfipark', 'Tuhalaane, Viljandimaa, Estonia', '9 korvi. Rada nr. 5 ning nr. 9 tuleb visata üle vee (vesi umbes 60 m). Asukoht on looduskaunis Tuhalaane küla Mulgi vallas.', 58.17577, 25.656075),
  ('turba-discgolfipark', 'Turba discgolfipark', 'Turba, Harjumaa, Estonia', null, 59.081068, 24.244791),
  ('turi-discgolfi-park', 'Türi discgolfipark', 'Türi discgolfi park, Järvamaa, Estonia', 'Järvamaal Türil asuv 9 korviga discgolfi park.', 58.8038568732745, 25.4558738095093),
  ('uhtjarve-urgoru-noiariigi-discgolfi-park', 'Uhtjärve Ürgoru Nõiariigi discgolfipark', 'Uhtjärve Ürgoru Nõiariigi discgolfi park, Võrumaa, Estonia', 'Amenities: Ketaste laenutus, WC, Majutus', 57.890402, 26.585197),
  ('uhtna-discgolfipark', 'Uhtna discgolfipark', 'Uhtna, lääneviru, Estonia', 'Lääne-Virumaal Rakvere lähedal Uhtnas asuv vanasse mõisaparki loodud 9-korviline discgolfipark.', 59.3945059570752, 26.5672507882118),
  ('umbsaare-marjametsa-discgolfipark', 'Umbsaare Marjametsa discgolfipark', 'Umbsaare Marjametsa, Võrumaa, Estonia', 'Tasuline 10-korviline discgolfipark. Raja alguses väike parkla. Poeta paar eurot parklast üle tee postkasti.

Fee: 2 €', 57.8174702, 27.0853558),
  ('vaana-joesuu-discgolfi-park', 'Vääna-Jõesuu discgolfipark', 'Vääna-Jõesuu discgolfi park, Harjumaa, Estonia', null, 59.4325135, 24.3707469),
  ('vaatsa-discgolfi-park', 'Väätsa discgolfipark', 'Väätsa, Järvamaa, Estonia', null, 58.888004, 25.4516316),
  ('valga-discgolfi-park', 'Valga discgolfipark', 'Valga discgolfi park, Valgamaa, Estonia', 'Valga linnapargis asuv 9 korviga discgolfi park.

Amenities: Spordihallist saab laenutada kettaid.', 57.7794839, 26.0511172),
  ('valga-jaanikese-discgolfipark', 'Valga Jaanikese discgolfipark', 'Valga Jaanikese, Valgamaa, Estonia', 'Jaanikese discgolfi park asub maalilises Jaanikese motokeskuses kuulsa Jaanikese krossiraja ümber, Valga linnast veidi Tartu poole! Rada on AA-võistlusrada 18 korviga pikkusega 2101m.', 57.8040904, 26.0618834),
  ('valgehobusemae-discgolfi-park', 'Valgehobusemäe discgolfipark', 'Valgehobusemäe discgolfi park, Järvamaa, Estonia', 'Järvamaal Valgehobusemäe suusa- ja puhkekeskuse ümber paiknev 19-korviga discgolfi park, soovitatav pigem edasijõudnutele. Suured kõrguste vahed ja pikad rajad võtavad võhmale ka kõige sportlikuma tegelase teie pundist.

Fee: 3 €

Amenities: Kohvik, Majutus, Ketaste laenutus', 59.2209813744564, 25.5636708465577),
  ('valgeranna-discgolfi-park', 'Valgeranna discgolfipark', 'Valgeranna, Pärnumaa, Estonia', 'Discgolf''i-klubi Hole In One eestvedamisel on Audru valda Valgeranna terviseradadele leidnud tee 18-rajaline discgolfi park.', 58.3890273136837, 24.3724608421326),
  ('valgu-discgolfi-park', 'Valgu discgolfipark', 'Valgu, Raplamaa, Estonia', '12 korviga discgolfi park Valgu mõisapargis. Sobib mänguks kõigile.', 58.817267, 24.58662),
  ('valjala-discgolfi-park', 'Valjala discgolfipark', 'Valjala, Saaremaa, Estonia', null, 58.4003439, 22.795331),
  ('valtu-discgolfi-park', 'Valtu discgolfipark', 'Valtu, Raplamaa, Estonia', 'Amenities: Ketaste laenutus, Ketaste müük, WC, Majutus', 58.962296571617, 24.8372554779053),
  ('valuoja-rotary-kettagolfipark', 'Valuoja Rotary kettagolfipark', 'Valuoja Rotary kettagolfipark, Viljandimaa, Estonia', 'Viljandi kesklinnas asuvas Valuoja orus 18.korviline discgolfirada paljude väljakutsetega.', 58.363803216663, 25.586820402447),
  ('vandra-discgolfi-park', 'Vändra discgolfipark', 'Vändra, Pärnumaa, Estonia', ':)

Amenities: Kettalaenutus Vändra Kultuurimajas', 58.6529293219095, 25.0294089317322),
  ('varska-discgolfipark', 'Värska discgolfipark', 'Värska, Võrumaa, Estonia', 'Värska Gümnaasiumi juures asuv 15-korviline discgolfipark', 57.9539269, 27.6340588),
  ('varska-sanatooriumi-discgolfi-park', 'Värska Sanatooriumi discgolfipark', 'Värska Sanatooriumi, Põlvamaa, Estonia', 'Amenities: Ketaste laenutus, Majutus, Toitlustus, SPA', 57.9849445268805, 27.6226437091827),
  ('vasalemma', 'Vasalemma', 'Vasalemma, Harjumaa, Estonia', null, 59.233744, 24.278432),
  ('vastse-kuuste-discgolfi-park', 'Vastse-Kuuste discgolfipark', 'Vastse-Kuuste, Põlvamaa, Estonia', 'Rajad 1-5 asuvad Vastse-Kuuste pargis ning 6-9 Tuulemäel (kultuurimaja juures).', 58.1645910115692, 26.9334983825684),
  ('vastseliina-discgolfi-park', 'Vastseliina discgolfipark', 'Vastseliina, Võrumaa, Estonia', null, 57.7335956, 27.2877035),
  ('vidrike-discgolfi-park', 'Vidrike discgolfipark', 'Vidrike discgolfi park, Valgamaa, Estonia', null, 57.9813041451119, 26.5218758583069),
  ('viimsi-discgolfipark', 'Viimsi discgolfipark', 'Linnakumetsa, Lubja küla, Viimsi vald, Harju maakond', '.
Viimsi Discgolf MTÜ
+372 5866 3727
Viimsidiscgolfclub@gmail.com', 59.497554, 24.85764),
  ('viljandi-discgolfi-park', 'Viljandi Rotary discgolfipark', 'Viljandi Rotary, Viljandimaa, Estonia', null, 58.3533394, 25.5876088),
  ('vinni-pajusti-discgolfi-park', 'Vinni-Pajusti discgolfipark', 'Vinni-Pajusti, lääneviru, Estonia', 'Algaja sõbralik 18 korviga discgolfi park Lääne-Virumaal, Rakvere lähistel. On nii mandosid kui ka OB-sid.

Amenities: Kohvik Vinni spordikompleksis', 59.287748549294, 26.422936906747),
  ('viru-jaagupi-discgolfipark', 'Viru-Jaagupi discgolfipark', 'Viru-Jaagupi, lääneviru, Estonia', null, 59.24321, 26.474314),
  ('vohma-discgolfipark', 'Võhma discgolfipark', 'Võhma, Viljandimaa, Estonia', null, 58.6281401, 25.5460308),
  ('voka-discgolfi-park', 'Voka discgolfipark', 'Voka, Ida-Virumaa, Estonia', 'Ida-Virumaal Voka paisjärve ääres paiknev 9 korviga discgolfi park.', 59.4069836663117, 27.5869488716125),
  ('vonnu-discgolfi-park', 'Võnnu discgolfipark', 'Võnnu discgolfi park, Tartumaa, Estonia', null, 58.2843766, 27.0507011),
  ('voore-discgolfipark', 'Voore discgolfipark', 'Voore, Jõgevamaa, Estonia', null, 58.7185783, 26.7486298),
  ('vooremae-discgolfipark', 'Vooremäe discgolfipark', 'Vooremäe, Tartumaa, Estonia', 'Tartu maakonnas asuv Vooremäe 18 korviga rada on mõeldud nii algajale kui edasijõudnule. Rajal on arvestatavad kõrguste vahed. Asub Tartust 20km

Amenities: Lähim pood asub Roiul, 2,5 km kaugusel', 58.2844258, 26.8917194),
  ('voru-kubija-discgolfi-park', 'Võru Kubija discgolfipark', 'Võru Kubija, Võrumaa, Estonia', 'Võrus Kubija järve läheduses Discgolfar.ee abil valminud 18 korviline discgolfi park.', 57.8115946157158, 26.9937086105347),
  ('voru-laane-discgolfipark', 'Võru Laane discgolfipark', 'Võru Laane, Võrumaa, Estonia', 'Võru 9-korviline discgolfipark', 57.8255095, 27.0098237)
) as v(slug, name, location, details, lat, lng)
where c.slug = v.slug;
