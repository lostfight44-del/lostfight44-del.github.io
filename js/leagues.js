/* VikingGOLD – ligák és csapatok (a gépeléskor ezek jelennek meg javaslatként).
   Bármit be lehet írni kézzel is, ami nincs a listában. Bővítéshez/javításhoz csak szerkeszd ezt a fájlt. */
const L = (n, t = '') => ({ n, t: t ? t.split('|').map(x => x.trim()).filter(Boolean) : [] });

export const LEAGUES = {
  labdarugas: [
    L('NB I (Magyarország)', 'Ferencváros|Győr|Paks|Debrecen|Zalaegerszeg|Puskás Akadémia|Újpest|Kisvárda|Diósgyőr|Nyíregyháza|MTK Budapest|Kazincbarcika|Videoton|Mezőkövesd|Szombathelyi Haladás|Békéscsaba|Vasas|Honvéd'),
    L('Premier League', 'Arsenal|Aston Villa|Bournemouth|Brentford|Brighton|Burnley|Chelsea|Crystal Palace|Everton|Fulham|Leeds United|Liverpool|Manchester City|Manchester United|Newcastle United|Nottingham Forest|Sunderland|Tottenham|West Ham|Wolverhampton|Leicester City|Ipswich Town|Southampton|Coventry City|Middlesbrough|Sheffield United'),
    L('La Liga', 'Alavés|Athletic Club|Atlético Madrid|Barcelona|Celta Vigo|Elche|Espanyol|Getafe|Girona|Levante|Mallorca|Osasuna|Rayo Vallecano|Real Betis|Real Madrid|Real Oviedo|Real Sociedad|Sevilla|Valencia|Villarreal|Las Palmas|Valladolid|Leganés'),
    L('Serie A', 'Atalanta|Bologna|Cagliari|Como|Cremonese|Fiorentina|Genoa|Hellas Verona|Inter|Juventus|Lazio|Lecce|Milan|Napoli|Parma|Pisa|Roma|Sassuolo|Torino|Udinese|Empoli|Monza|Venezia'),
    L('Bundesliga (Németország)', 'Augsburg|Union Berlin|Bayer Leverkusen|Bayern München|Borussia Dortmund|Borussia Mönchengladbach|Eintracht Frankfurt|Freiburg|Hamburger SV|Heidenheim|Hoffenheim|1. FC Köln|Mainz 05|RB Leipzig|St. Pauli|Stuttgart|Werder Bremen|Wolfsburg|Bochum|Holstein Kiel'),
    L('Ligue 1', 'Angers|Auxerre|Brest|Le Havre|Lens|Lille|Lorient|Lyon|Marseille|Metz|Monaco|Nantes|Nice|Paris FC|Paris Saint-Germain|Rennes|Strasbourg|Toulouse|Reims|Montpellier|Saint-Étienne'),
    L('Eredivisie', 'Ajax|PSV|Feyenoord|AZ Alkmaar|Twente|Utrecht|Heerenveen|Go Ahead Eagles|NEC Nijmegen|Sparta Rotterdam|Fortuna Sittard|Groningen|Heracles|PEC Zwolle|Excelsior|Telstar|NAC Breda|Volendam|Willem II|RKC Waalwijk'),
    L('Liga Portugal', 'Benfica|Porto|Sporting CP|Braga|Vitória SC|Famalicão|Moreirense|Estoril|Gil Vicente|Casa Pia|Arouca|Rio Ave|Santa Clara|Nacional|Tondela|Alverca|AVS|Estrela Amadora'),
    L('Osztrák Bundesliga', 'Red Bull Salzburg|Sturm Graz|LASK|Rapid Wien|Austria Wien|Wolfsberger AC|Hartberg|Austria Klagenfurt|Altach|BW Linz|Ried|WSG Tirol|GAK'),
    L('Skót Premiership', 'Celtic|Rangers|Hearts|Hibernian|Aberdeen|Dundee United|Dundee|Motherwell|Kilmarnock|St Mirren|Falkirk|Livingston'),
    L('Török Süper Lig', 'Galatasaray|Fenerbahçe|Beşiktaş|Trabzonspor|Başakşehir|Samsunspor|Konyaspor|Antalyaspor|Kasımpaşa|Alanyaspor|Rizespor|Gaziantep|Göztepe|Eyüpspor|Kayserispor|Kocaelispor'),
    L('Bajnokok Ligája'), L('Európa-liga'), L('Konferencia-liga'),
    L('Válogatott', 'Magyarország|Anglia|Spanyolország|Franciaország|Németország|Olaszország|Portugália|Hollandia|Belgium|Horvátország|Svájc|Ausztria|Dánia|Svédország|Norvégia|Lengyelország|Csehország|Szlovákia|Szerbia|Románia|Skócia|Írország|Ukrajna|Törökország|Görögország|Brazília|Argentína|Uruguay|Kolumbia|USA|Mexikó|Japán|Dél-Korea|Marokkó|Szenegál')
  ],
  jegkorong: [
    L('NHL', 'Anaheim Ducks|Boston Bruins|Buffalo Sabres|Calgary Flames|Carolina Hurricanes|Chicago Blackhawks|Colorado Avalanche|Columbus Blue Jackets|Dallas Stars|Detroit Red Wings|Edmonton Oilers|Florida Panthers|Los Angeles Kings|Minnesota Wild|Montréal Canadiens|Nashville Predators|New Jersey Devils|New York Islanders|New York Rangers|Ottawa Senators|Philadelphia Flyers|Pittsburgh Penguins|San Jose Sharks|Seattle Kraken|St. Louis Blues|Tampa Bay Lightning|Toronto Maple Leafs|Utah Mammoth|Vancouver Canucks|Vegas Golden Knights|Washington Capitals|Winnipeg Jets'),
    L('AHL', 'Abbotsford Canucks|Bakersfield Condors|Belleville Senators|Bridgeport Islanders|Calgary Wranglers|Charlotte Checkers|Chicago Wolves|Cleveland Monsters|Coachella Valley Firebirds|Colorado Eagles|Grand Rapids Griffins|Hamilton Hammers|Hartford Wolf Pack|Henderson Silver Knights|Hershey Bears|Iowa Wild|Laval Rocket|Lehigh Valley Phantoms|Manitoba Moose|Milwaukee Admirals|Ontario Reign|Providence Bruins|Rochester Americans|Rockford IceHogs|San Diego Gulls|San Jose Barracuda|Springfield Thunderbirds|Syracuse Crunch|Texas Stars|Toronto Marlies|Tucson Roadrunners|Utica Comets|Wilkes-Barre/Scranton Penguins'),
    L('SHL (Svédország)', 'Brynäs IF|Djurgårdens IF|Färjestad BK|Frölunda HC|HV71|Leksands IF|Linköping HC|Luleå HF|Malmö Redhawks|Örebro HK|Rögle BK|Skellefteå AIK|Timrå IK|Växjö Lakers|IK Oskarshamn'),
    L('HockeyAllsvenskan', 'AIK|Almtuna IS|BIK Karlskoga|IF Björklöven|IK Oskarshamn|Kristianstads IK|MoDo Hockey|Mora IK|Nybro Vikings|Södertälje SK|Sundsvall Hockey|Västerås IK|Vimmerby HC|Östersunds IK|Tingsryds AIF'),
    L('Liiga (Finnország)', 'HIFK|HPK|Ilves|Jukurit|JYP|K-Espoo|KalPa|KooKoo|Kärpät|Lukko|Pelicans|SaiPa|Sport|Tappara|TPS|Ässät|Jokerit'),
    L('Extraliga (Csehország)', 'HC Sparta Praha|HC Slavia Praha|Bílí Tygři Liberec|HC Kometa Brno|Mountfield Hradec Králové|HC Oceláři Třinec|HC Vítkovice Ridera|HC Škoda Plzeň|HC Dynamo Pardubice|HC Verva Litvínov|Piráti Chomutov|Rytíři Kladno|BK Mladá Boleslav|HC Energie Karlovy Vary|HC Olomouc|Motor České Budějovice'),
    L('National League (Svájc)', 'HC Ambrì-Piotta|SC Bern|EHC Biel-Bienne|HC Davos|HC Fribourg-Gottéron|Genève-Servette HC|SCL Tigers|HC Lugano|EHC Kloten|SC Rapperswil-Jona Lakers|ZSC Lions|EV Zug|Lausanne HC|HC Ajoie'),
    L('Swiss League', 'HC Thurgau|EHC Basel|GCK Lions|HC La Chaux-de-Fonds|EHC Visp|Bellinzona Snakes|EHC Olten|EHC Winterthur|HC Sierre|SC Langenthal|HC Ajoie|EHC Kloten|HCB Ticino Rockets'),
    L('DEL (Németország)', 'Adler Mannheim|Eisbären Berlin|EHC Red Bull München|Kölner Haie|Düsseldorfer EG|Straubing Tigers|Grizzlys Wolfsburg|Fischtown Pinguins Bremerhaven|ERC Ingolstadt|Nürnberg Ice Tigers|Schwenninger Wild Wings|Augsburger Panther|Löwen Frankfurt|Iserlohn Roosters'),
    L('ICE Hockey League', 'EC Red Bull Salzburg|Vienna Capitals|Graz99ers|EC KAC Klagenfurt|EC VSV Villach|Steinbach Black Wings Linz|HC Bolzano|HC Pustertal|Hydro Fehérvár AV19|Asiago Hockey|HK Olimpija Ljubljana|Dornbirn Bulldogs|HC Innsbruck|Pioneers Vorarlberg'),
    L('KHL', 'CSKA Moscow|SKA Saint Petersburg|Ak Bars Kazan|Avangard Omsk|Metallurg Magnitogorsk|Salavat Yulaev Ufa|Lokomotiv Yaroslavl|Dynamo Moscow|Spartak Moscow|Traktor Chelyabinsk|Torpedo Nizhny Novgorod|Sibir Novosibirsk|Avtomobilist Yekaterinburg|Severstal Cherepovets|Admiral Vladivostok|Amur Khabarovsk|Barys Astana|Neftekhimik Nizhnekamsk|Dinamo Minsk|Lada Togliatti|HC Sochi|Vityaz Podolsk'),
    L('Norvég GET-ligaen', 'Stjernen|Narvik|Storhamar|Vålerenga|Frisk Asker|Sparta Sarpsborg|Lørenskog|Stavanger Oilers|Comet Halden'),
    L('Dán Metal Ligaen', 'Esbjerg Energy|Rungsted Seier Capital|Aalborg Pirates|Herning Blue Fox|Odense Bulldogs|Frederikshavn White Hawks|Rødovre Mighty Bulls|SønderjyskE|Gentofte Stars'),
    L('Szlovák Extraliga', 'HC Slovan Bratislava|HC Košice|HC Banská Bystrica|HK Nitra|HK Poprad|AS Trenčín|HKM Zvolen|HK Dukla Michalovce|MHk 32 Liptovský Mikuláš|MsHK Žilina'),
    L('Magyar / Erste Liga', 'Hydro Fehérvár AV19|Újpesti TE|Ferencvárosi TC|MAC Budapest|Debreceni HK|Gyergyói HK|Csíkszeredai Sport Club|Brassói Corona|Sportklub Miercurea Ciuc|DVTK Jegesmedvék'),
    L('Válogatott', 'Magyarország|Kanada|USA|Svédország|Finnország|Csehország|Svájc|Németország|Szlovákia|Lettország|Dánia|Norvégia|Ausztria|Franciaország|Kazahsztán|Olaszország')
  ],
  kezilabda: [
    L('NB I férfi (Magyarország)', 'One Veszprém|OTP Bank-Pick Szeged|Tatabánya|Balatonfüredi KSE|Ferencváros|Csurgói KK|Gyöngyösi KK|Dabas KC|Eger-Eszterházy SC|Budai Farkasok-Rév|Mezőkövesdi KC|PLER-Budapest|Ajka|Orosházi FKSE'),
    L('NB I női (Magyarország)', 'Győri Audi ETO KC|FTC-Rail Cargo Hungaria|DVSC Schaeffler|Váci NKSE|Mosonmagyaróvári KC|Siófok KC|Érd|Kisvárda Master Good|Alba Fehérvár KC|Budaörs|MTK Budapest|Békéscsabai ENKSE|Kozármisleny|Szent István SE'),
    L('Bundesliga (Németország)', 'THW Kiel|SG Flensburg-Handewitt|SC Magdeburg|Füchse Berlin|Rhein-Neckar Löwen|HSV Hamburg|TSV Hannover-Burgdorf|MT Melsungen|Frisch Auf Göppingen|TBV Lemgo Lippe|HC Erlangen|VfL Gummersbach|Bergischer HC|SC DHfK Leipzig|TVB Stuttgart|HSG Wetzlar|Eulen Ludwigshafen|ThSV Eisenach|HBW Balingen-Weilstetten|GWD Minden'),
    L('Starligue (Franciaország)', 'Paris Saint-Germain|Montpellier|Nantes|Nîmes|Chambéry|Dunkerque|Toulouse|Aix|Saint-Raphaël|Cesson-Rennes|Sélestat|Istres|Créteil|Chartres|Limoges|Tremblay'),
    L('Liga ASOBAL (Spanyolország)', 'Barcelona|Bidasoa Irún|Granollers|Logroño|Ademar León|Cuenca|Benidorm|Atlético Valladolid|Puente Genil|Torrelavega|Sinfín|Anaitasuna|Guadalajara|Burgos'),
    L('Dán Håndboldligaen', 'Aalborg Håndbold|GOG|Skjern Håndbold|Mors-Thy|Bjerringbro-Silkeborg|Fredericia HK|Sønderjyske|Ribe-Esbjerg|Kolding|Nordsjælland|TTH Holstebro|Skanderborg'),
    L('Bajnokok Ligája (EHF)'), L('Európa Liga (EHF)'),
    L('Válogatott', 'Magyarország|Dánia|Franciaország|Svédország|Spanyolország|Németország|Norvégia|Horvátország|Szlovénia|Portugália|Izland|Egyiptom|Argentína|Brazília|Hollandia|Szerbia|Svájc|Csehország|Észak-Macedónia|Lengyelország')
  ],
  kosarlabda: [
    L('NBA', 'Atlanta Hawks|Boston Celtics|Brooklyn Nets|Charlotte Hornets|Chicago Bulls|Cleveland Cavaliers|Dallas Mavericks|Denver Nuggets|Detroit Pistons|Golden State Warriors|Houston Rockets|Indiana Pacers|LA Clippers|Los Angeles Lakers|Memphis Grizzlies|Miami Heat|Milwaukee Bucks|Minnesota Timberwolves|New Orleans Pelicans|New York Knicks|Oklahoma City Thunder|Orlando Magic|Philadelphia 76ers|Phoenix Suns|Portland Trail Blazers|Sacramento Kings|San Antonio Spurs|Toronto Raptors|Utah Jazz|Washington Wizards'),
    L('EuroLeague', 'Real Madrid|Barcelona|Olympiacos|Panathinaikos|Fenerbahçe|Anadolu Efes|Partizan|Crvena zvezda|Baskonia|Maccabi Tel Aviv|Žalgiris Kaunas|Bayern München|Monaco|Virtus Bologna|Olimpia Milano|ASVEL|Paris Basketball|Hapoel Tel Aviv|Dubai Basketball|Valencia'),
    L('EuroCup', 'Valencia|Joventut Badalona|Lyon-Villeurbanne|Bursaspor|Hapoel Jerusalem|Turk Telekom|Cedevita Olimpija|Buducnost|Trento|Umana Reyer Venezia|Wolves Vilnius|Bahçeşehir|London Lions|Ulm|Gran Canaria|Level Up Szeged'),
    L('ACB (Spanyolország)', 'Real Madrid|Barcelona|Baskonia|Valencia|Unicaja|Joventut Badalona|Gran Canaria|Lenovo Tenerife|Bilbao Basket|Murcia|Manresa|Girona|Zaragoza|Breogán|Andorra|Obradoiro|Río Breogán|Granada|Surne Bilbao'),
    L('NB I/A férfi (Magyarország)', 'Falco Szombathely|Szolnoki Olajbányász|Alba Fehérvár|Atomerőmű SE|Egis Körmend|DEAC|Zalaegerszegi TE|Kaposvár|Sopron Basket|PVSK-Panthers|Debreceni EAC|Jászberényi KSE|Kecskeméti TE|Budapest Honvéd'),
    L('NB I/A női (Magyarország)', 'Sopron Basket|DKSK|Euroleasing Sopron|PEAC-Pécs|Atomerőmű KSC Szekszárd|Győri ETO|Uni Győr|MTK Budapest|Cegléd|BEAC|Szigetszentmiklós|Vasas Akadémia|DVTK Miskolc'),
    L('Válogatott', 'Magyarország|USA|Spanyolország|Franciaország|Szerbia|Németország|Görögország|Litvánia|Olaszország|Kanada|Ausztrália|Szlovénia|Horvátország|Lettország|Finnország|Törökország|Brazília|Argentína'),
  ],
  tenisz: [
    L('Grand Slam', ''), L('ATP Masters 1000', ''), L('ATP 500', ''), L('ATP 250', ''), L('ATP Finals', ''), L('ATP Challenger', ''),
    L('WTA 1000', ''), L('WTA 500', ''), L('WTA 250', ''), L('WTA Finals', ''), L('ITF', ''),
    L('Davis-kupa', ''), L('Billie Jean King-kupa', ''),
  ],
};

/* Európai kupák: a csapatlista az összes hazai bajnokság klubjaiból áll (a válogatott kivételével) */
(() => {
  const fb = LEAGUES.labdarugas || [];
  const clubs = [...new Set(fb.filter(l => l.n !== 'Válogatott').flatMap(l => l.t))].sort((a, b) => a.localeCompare(b, 'hu'));
  fb.forEach(l => { if (['Bajnokok Ligája', 'Európa-liga', 'Konferencia-liga'].includes(l.n) && !l.t.length) l.t = clubs; });
})();

/* Kézilabda EHF-kupák: a hazai bajnokságok klubjaiból */
(() => {
  const hb = LEAGUES.kezilabda || [];
  const clubs = [...new Set(hb.filter(l => l.n !== 'Válogatott').flatMap(l => l.t))].sort((a, b) => a.localeCompare(b, 'hu'));
  hb.forEach(l => { if (/EHF/.test(l.n) && !l.t.length) l.t = clubs; });
})();

/* Tenisz: a tornák játékosai (férfi / női); kézzel bármilyen név beírható */
(() => {
  const men = 'Jannik Sinner|Carlos Alcaraz|Novak Djokovic|Alexander Zverev|Daniil Medvedev|Taylor Fritz|Alex de Minaur|Jack Draper|Ben Shelton|Lorenzo Musetti|Holger Rune|Casper Ruud|Andrey Rublev|Stefanos Tsitsipas|Tommy Paul|Félix Auger-Aliassime|Alexei Popyrin|Frances Tiafoe|Grigor Dimitrov|Ugo Humbert|Karen Khachanov|Jakub Menšík|Joao Fonseca|Arthur Fils|Flavio Cobolli|Alexander Bublik|Francisco Cerundolo|Learner Tien|Hubert Hurkacz|Matteo Berrettini|Fucsovics Márton|Valkusz Máté|Piros Zsombor|Marozsán Fábián'.split('|');
  const women = 'Aryna Sabalenka|Iga Świątek|Coco Gauff|Jessica Pegula|Elena Rybakina|Madison Keys|Amanda Anisimova|Mirra Andreeva|Jasmine Paolini|Qinwen Zheng|Emma Navarro|Elina Svitolina|Naomi Osaka|Jelena Ostapenko|Karolina Muchová|Victoria Mboko|Ekaterina Alexandrova|Paula Badosa|Marta Kostyuk|Belinda Bencic|Diana Shnaider|Clara Tauson|Daria Kasatkina|Linda Nosková|Gálfi Dalma|Bondár Anna|Udvardy Panna|Stollár Fanny|Jani Réka'.split('|');
  const m = n => /^(ATP|Davis)/.test(n) || n === 'Grand Slam' || n === 'ITF', w = n => /^(WTA|Billie)/.test(n) || n === 'Grand Slam' || n === 'ITF';
  (LEAGUES.tenisz || []).forEach(l => { l.t = [...(m(l.n) ? men : []), ...(w(l.n) ? women : [])].sort((a, b) => a.localeCompare(b, 'hu')); });
})();
