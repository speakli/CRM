import csv

COMPANIES_FILE = '/Users/lenisultan/open-source-crm/data/companies.tsv'
CONTACTS_FILE  = '/Users/lenisultan/open-source-crm/data/contacts.tsv'

COMPANY_HEADERS = [
    'id','name','website','phone','address','linkedin_url','industry','tagline',
    'funnel_stage','employees','uses_netsoins','type_etablissement','nb_etablissements',
    'score_icp','city','region','country','summary','notes','next_action',
    'created_by','created_at','updated_by','updated_at',
]
CONTACT_HEADERS = [
    'id','company_id','name','job_title','linkedin','email','phone',
    'funnel_stage','temperature','recap','next_action',
    'created_at','source','created_by','updated_by','updated_at',
]

def co(id,name,city,address,nb,summary,next_action,employees='',website=''):
    return {
        'id': id, 'name': name, 'website': website, 'phone': '', 'address': address,
        'linkedin_url': '', 'industry': 'EHPAD', 'tagline': '',
        'funnel_stage': 'Premier contact', 'employees': employees,
        'uses_netsoins': 'Oui', 'type_etablissement': 'Groupe',
        'nb_etablissements': str(nb), 'score_icp': '2',
        'city': city, 'region': 'Île-de-France', 'country': 'France',
        'summary': summary, 'notes': '', 'next_action': next_action,
        'created_by': 'Claude', 'created_at': '2026-05-27', 'updated_by': '', 'updated_at': '',
    }

def ct(id, company_id, name, job_title='Directeur/Directrice', linkedin='', next_action=''):
    if not next_action:
        next_action = f'Établir le premier contact avec {name}'
    return {
        'id': id, 'company_id': company_id, 'name': name, 'job_title': job_title,
        'linkedin': linkedin, 'email': '', 'phone': '',
        'funnel_stage': 'Premier contact', 'temperature': '', 'recap': '',
        'next_action': next_action,
        'created_at': '2026-05-27', 'source': 'Enrichissement Claude',
        'created_by': 'Claude', 'updated_by': '', 'updated_at': '',
    }

NO_DIR = 'Identifier le directeur et établir le premier contact'

companies = [

    # ── CLINALLIANCE (ex-Repotel) — 9 établissements IDF ──────────────────────
    co('repotel-paris-gambetta', 'EHPAD Repotel Paris Gambetta',
       'Paris', '161/163 avenue Gambetta, 75020 Paris', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Paris 20e',
       'Identifier le prénom de Mme Gaillard et établir le premier contact'),

    co('repotel-gennevilliers', 'EHPAD Repotel Gennevilliers',
       'Gennevilliers', '49 rue du Pont d\'Argenteuil, 92230 Gennevilliers', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Gennevilliers (92)',
       'Établir le premier contact avec Marie Léonard'),

    co('repotel-issy-les-moulineaux', 'EHPAD Repotel Issy-les-Moulineaux',
       'Issy-les-Moulineaux', '23 avenue Jean Jaurès, 92130 Issy-les-Moulineaux', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Issy-les-Moulineaux (92)',
       'Identifier le prénom de Mme Guhennec et établir le premier contact'),

    co('repotel-maurepas', 'EHPAD Repotel Maurepas',
       'Maurepas', 'Square de la Puisaye, 78310 Maurepas', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Maurepas (78)',
       'Établir le premier contact avec Giulia Mitri'),

    co('repotel-voisins-le-bretonneux', 'EHPAD Repotel Voisins-le-Bretonneux',
       'Voisins-le-Bretonneux', '38 rue aux Fleurs, 78960 Voisins-le-Bretonneux', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Voisins-le-Bretonneux (78)',
       'Identifier le prénom de Mme Mitri et établir le premier contact'),

    co('repotel-marcoussis', 'EHPAD Repotel Marcoussis',
       'Marcoussis', '30 rue Moutard Martin, 91460 Marcoussis', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Marcoussis (91)',
       'Établir le premier contact avec Myriam Bureau'),

    co('repotel-brunoy', 'EHPAD Repotel Brunoy',
       'Brunoy', '3 rue des Godeaux, 91800 Brunoy', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Brunoy (91)',
       'Établir le premier contact avec Raphaëlle Redois'),

    co('repotel-lieusaint', 'EHPAD Repotel Lieusaint',
       'Lieusaint', '12 allée Perce Neige, 77127 Lieusaint', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Lieusaint (77)',
       'Établir le premier contact avec Mélanie Savignat'),

    co('repotel-savigny-le-temple', 'EHPAD Repotel Savigny-le-Temple',
       'Savigny-le-Temple', '512 Chemin d\'Arvigny, 77176 Savigny-le-Temple', 9,
       'EHPAD du groupe Clinalliance (ex-Repotel), Savigny-le-Temple (77)',
       'Identifier le prénom de Mme Leflon et établir le premier contact'),

    # ── LNA SANTÉ — 11 établissements IDF ────────────────────────────────────
    co('lna-villa-epidaure-garches', 'Villa d\'Épidaure Garches',
       'Garches', 'Garches, 92380', 50,
       'EHPAD du groupe LNA Santé, Garches (92)',
       'Établir le premier contact avec Nabila Sidhoum'),

    co('lna-villa-caudacienne-queue-brie', 'Villa Caudacienne La Queue-en-Brie',
       'La Queue-en-Brie', 'La Queue-en-Brie, 94510', 50,
       'EHPAD du groupe LNA Santé, La Queue-en-Brie (94)',
       'Établir le premier contact avec Karen Souter'),

    co('lna-residence-sevigne-saint-maur', 'Résidence Sévigné Saint-Maur',
       'Saint-Maur-des-Fossés', 'Saint-Maur-des-Fossés, 94100', 50,
       'EHPAD du groupe LNA Santé, Saint-Maur-des-Fossés (94)',
       NO_DIR),

    co('lna-jardins-ennery', 'Les Jardins d\'Ennery',
       'Ennery', 'Ennery, 95300', 50,
       'EHPAD du groupe LNA Santé, Ennery (95)',
       'Établir le premier contact avec François Rouchette'),

    co('lna-asphodia-yerres', 'Résidence Asphodia Yerres',
       'Yerres', 'Yerres, 91330', 50,
       'EHPAD du groupe LNA Santé, Yerres (91)',
       'Établir le premier contact avec Joëlle Le Gal'),

    co('lna-marconi-chatou', 'Résidence Marconi Chatou',
       'Chatou', 'Chatou, 78400', 50,
       'EHPAD du groupe LNA Santé, Chatou (78)',
       'Établir le premier contact avec Agnès Roos'),

    co('lna-villa-epidaure-celle-saint-cloud', 'Villa d\'Épidaure La Celle-Saint-Cloud',
       'La Celle-Saint-Cloud', 'La Celle-Saint-Cloud, 78170', 50,
       'EHPAD du groupe LNA Santé, La Celle-Saint-Cloud (78)',
       'Établir le premier contact avec Nabila Sidhoum'),

    co('lna-berges-danube-serris', 'Les Berges du Danube Serris',
       'Serris', 'Serris, 77700', 50,
       'EHPAD du groupe LNA Santé, Serris (77)',
       'Établir le premier contact avec Anaïs Hennequin'),

    co('lna-meuliere-marne-ferte', 'La Meulière de la Marne La Ferté-sous-Jouarre',
       'La Ferté-sous-Jouarre', 'La Ferté-sous-Jouarre, 77260', 50,
       'EHPAD du groupe LNA Santé, La Ferté-sous-Jouarre (77)',
       'Établir le premier contact avec Bertille Keruzoret'),

    co('lna-harmonie-moret', 'Résidence Harmonie Moret-sur-Loing',
       'Moret-sur-Loing', 'Moret-sur-Loing, 77250', 50,
       'EHPAD du groupe LNA Santé, Moret-sur-Loing (77)',
       'Établir le premier contact avec Fabrice Ettori'),

    co('lna-jardins-ourcq-meaux', 'Les Jardins de l\'Ourcq Meaux',
       'Meaux', 'Meaux, 77100', 50,
       'EHPAD du groupe LNA Santé, Meaux (77)',
       'Établir le premier contact avec Merouane Mele'),

    # ── ADEF RÉSIDENCES — 15 établissements IDF ───────────────────────────────
    co('adef-maison-parc-paris13', 'La Maison du Parc',
       'Paris', 'Paris 13e, 75013', 42,
       'EHPAD du groupe ADEF Résidences, Paris 13e (75)',
       NO_DIR),

    co('adef-cytises-gennevilliers', 'La Maison des Cytises',
       'Gennevilliers', 'Gennevilliers, 92230', 42,
       'EHPAD du groupe ADEF Résidences, Gennevilliers (92)', NO_DIR,
       employees='82'),

    co('adef-erable-clamart', 'La Maison de l\'Érable Argenté',
       'Clamart', 'Clamart, 92140', 42,
       'EHPAD du groupe ADEF Résidences, Clamart (92)', NO_DIR,
       employees='110'),

    co('adef-grand-cedre-arcueil', 'La Maison du Grand Cèdre',
       'Arcueil', 'Arcueil, 94110', 42,
       'EHPAD du groupe ADEF Résidences, Arcueil (94)', NO_DIR,
       employees='85'),

    co('adef-saule-cendre-orly', 'La Maison du Saule Cendré',
       'Orly', 'Orly, 94310', 42,
       'EHPAD du groupe ADEF Résidences, Orly (94)', NO_DIR,
       employees='83'),

    co('adef-roses-villecresnes', 'La Maison du Jardin des Roses',
       'Villecresnes', 'Villecresnes, 94290', 42,
       'EHPAD du groupe ADEF Résidences, Villecresnes (94)', NO_DIR,
       employees='84'),

    co('adef-sorieres-rungis', 'La Maison des Sorières',
       'Rungis', 'Rungis, 94150', 42,
       'EHPAD du groupe ADEF Résidences, Rungis (94)', NO_DIR,
       employees='80'),

    co('adef-chantereine-choisy', 'La Maison de la Chantereine',
       'Choisy-le-Roi', 'Choisy-le-Roi, 94600', 42,
       'EHPAD du groupe ADEF Résidences, Choisy-le-Roi (94)', NO_DIR,
       employees='81'),

    co('adef-laurier-saint-denis', 'La Maison du Laurier Noble',
       'Saint-Denis', 'Saint-Denis, 93200', 42,
       'EHPAD du groupe ADEF Résidences, Saint-Denis (93)', NO_DIR,
       employees='75'),

    co('adef-eglantier-bondy', 'La Maison de l\'Églantier',
       'Bondy', 'Bondy, 93140', 42,
       'EHPAD du groupe ADEF Résidences, Bondy (93)', NO_DIR,
       employees='85'),

    co('adef-glycines-bourget', 'La Maison des Glycines',
       'Le Bourget', 'Le Bourget, 93350', 42,
       'EHPAD du groupe ADEF Résidences, Le Bourget (93)', NO_DIR,
       employees='94'),

    co('adef-vallee-fleurs-stains', 'La Maison de la Vallée des Fleurs',
       'Stains', 'Stains, 93240', 42,
       'EHPAD du groupe ADEF Résidences, Stains (93)', NO_DIR,
       employees='84'),

    co('adef-cedre-bleu-saint-pierre', 'La Maison du Cèdre Bleu',
       'Saint-Pierre-du-Perray', 'Saint-Pierre-du-Perray, 91280', 42,
       'EHPAD du groupe ADEF Résidences, Saint-Pierre-du-Perray (91)', NO_DIR,
       employees='138'),

    co('adef-clematites-corbeil', 'La Maison des Clématites',
       'Corbeil-Essonnes', 'Corbeil-Essonnes, 91100', 42,
       'EHPAD du groupe ADEF Résidences, Corbeil-Essonnes (91)', NO_DIR,
       employees='80'),

    co('adef-merisiers-morsang', 'La Maison des Merisiers',
       'Morsang-sur-Orge', 'Morsang-sur-Orge, 91390', 42,
       'EHPAD du groupe ADEF Résidences, Morsang-sur-Orge (91)', NO_DIR,
       employees='84'),

    # ── DOMUSVI — 9 établissements IDF ───────────────────────────────────────
    co('domusvi-oceane-paris19', 'Résidence Océane',
       'Paris', 'Paris 19e, 75019', 200,
       'EHPAD du groupe DomusVi, Paris 19e (75)', NO_DIR),

    co('domusvi-gobelins-paris13', 'Résidence Les Gobelins',
       'Paris', 'Paris 13e, 75013', 200,
       'EHPAD du groupe DomusVi, Paris 13e (75)', NO_DIR),

    co('domusvi-tiers-temps-paris14', 'Résidence Tiers Temps',
       'Paris', 'Paris 14e, 75014', 200,
       'EHPAD du groupe DomusVi, Paris 14e (75)', NO_DIR),

    co('domusvi-villa-caroline-gennevilliers', 'Villa Caroline',
       'Gennevilliers', 'Gennevilliers, 92230', 200,
       'EHPAD du groupe DomusVi, Gennevilliers (92)', NO_DIR),

    co('domusvi-passerelle-vitry', 'La Passerelle des Arts',
       'Vitry-sur-Seine', 'Vitry-sur-Seine, 94400', 200,
       'EHPAD du groupe DomusVi, Vitry-sur-Seine (94)', NO_DIR),

    co('domusvi-clementine-pitois-ablon', 'Résidence Clémentine Pitois',
       'Ablon-sur-Seine', 'Ablon-sur-Seine, 94480', 200,
       'EHPAD du groupe DomusVi, Ablon-sur-Seine (94)', NO_DIR),

    co('domusvi-acacias-saint-maurice', 'Les Jardins des Acacias',
       'Saint-Maurice', 'Saint-Maurice, 94410', 200,
       'EHPAD du groupe DomusVi, Saint-Maurice (94)', NO_DIR),

    co('domusvi-jardins-thiais', 'Résidence Les Jardins de Thiais',
       'Thiais', 'Thiais, 94320', 200,
       'EHPAD du groupe DomusVi, Thiais (94)', NO_DIR),

    co('domusvi-epinay', 'Les Jardins d\'Épinay',
       'Épinay-sur-Seine', 'Épinay-sur-Seine, 93800', 200,
       'EHPAD du groupe DomusVi, Épinay-sur-Seine (93)', NO_DIR),

    # ── PARTAGE ET VIE — 2 établissements IDF ────────────────────────────────
    co('partage-vie-quatre-saisons-plessis', 'EHPAD Aux Quatre Saisons',
       'Le Plessis-Robinson', 'Le Plessis-Robinson, 92350', 86,
       'EHPAD du groupe Partage et Vie, Le Plessis-Robinson (92)', NO_DIR),

    co('partage-vie-lanmodez-saint-mande', 'EHPAD Lanmodez',
       'Saint-Mandé', 'Saint-Mandé, 94160', 86,
       'EHPAD du groupe Partage et Vie, Saint-Mandé (94)', NO_DIR),

    # ── COLISÉE — 4 établissements IDF ───────────────────────────────────────
    co('colisee-maison-parents-paris13', 'La Maison des Parents',
       'Paris', 'Paris 13e, 75013', 218,
       'EHPAD du groupe Colisée, Paris 13e (75)', NO_DIR),

    co('colisee-val-osne-saint-maurice', 'Résidence Le Val d\'Osne',
       'Saint-Maurice', 'Saint-Maurice, 94410', 218,
       'EHPAD du groupe Colisée, Saint-Maurice (94)', NO_DIR),

    co('colisee-arc-boise-champigny', 'Résidence de l\'Arc Boisé',
       'Champigny-sur-Marne', 'Champigny-sur-Marne, 94500', 218,
       'EHPAD du groupe Colisée, Champigny-sur-Marne (94)', NO_DIR),

    co('colisee-epervier-bourget', 'Résidence L\'Épervier',
       'Le Bourget', 'Le Bourget, 93350', 218,
       'EHPAD du groupe Colisée, Le Bourget (93)', NO_DIR),
]

contacts = [
    # ── CLINALLIANCE directors ──
    ct('gaillard-repotel-paris-gambetta', 'repotel-paris-gambetta',
       'Mme Gaillard', next_action='Identifier le prénom de Mme Gaillard et établir le premier contact'),
    ct('marie-leonard-repotel-gennevilliers', 'repotel-gennevilliers', 'Marie Léonard'),
    ct('guhennec-repotel-issy', 'repotel-issy-les-moulineaux',
       'Mme Guhennec', next_action='Identifier le prénom de Mme Guhennec et établir le premier contact'),
    ct('giulia-mitri-repotel-maurepas', 'repotel-maurepas', 'Giulia Mitri'),
    ct('mitri-repotel-voisins', 'repotel-voisins-le-bretonneux',
       'Mme Mitri', next_action='Identifier le prénom de Mme Mitri et établir le premier contact'),
    ct('myriam-bureau-repotel-marcoussis', 'repotel-marcoussis', 'Myriam Bureau'),
    ct('raphaelle-redois-repotel-brunoy', 'repotel-brunoy', 'Raphaëlle Redois'),
    ct('melanie-savignat-repotel-lieusaint', 'repotel-lieusaint', 'Mélanie Savignat'),
    ct('leflon-repotel-savigny', 'repotel-savigny-le-temple',
       'Mme Leflon', next_action='Identifier le prénom de Mme Leflon et établir le premier contact'),

    # ── LNA SANTÉ directors ──
    ct('nabila-sidhoum-villa-epidaure-garches', 'lna-villa-epidaure-garches', 'Nabila Sidhoum'),
    ct('karen-souter-villa-caudacienne', 'lna-villa-caudacienne-queue-brie', 'Karen Souter'),
    ct('francois-rouchette-jardins-ennery', 'lna-jardins-ennery', 'François Rouchette'),
    ct('joelle-legal-asphodia-yerres', 'lna-asphodia-yerres', 'Joëlle Le Gal'),
    ct('agnes-roos-marconi-chatou', 'lna-marconi-chatou', 'Agnès Roos'),
    ct('nabila-sidhoum-villa-epidaure-celle', 'lna-villa-epidaure-celle-saint-cloud', 'Nabila Sidhoum'),
    ct('anais-hennequin-berges-danube', 'lna-berges-danube-serris', 'Anaïs Hennequin'),
    ct('bertille-keruzoret-meuliere-marne', 'lna-meuliere-marne-ferte', 'Bertille Keruzoret'),
    ct('fabrice-ettori-harmonie-moret', 'lna-harmonie-moret', 'Fabrice Ettori'),
    ct('merouane-mele-jardins-ourcq', 'lna-jardins-ourcq-meaux', 'Merouane Mele'),
]

assert len(companies) == 50, f"Expected 50 companies, got {len(companies)}"
assert len(contacts) == 19, f"Expected 19 contacts, got {len(contacts)}"

# Append to companies.tsv
with open(COMPANIES_FILE, 'a', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=COMPANY_HEADERS, delimiter='\t', lineterminator='\n')
    for c in companies:
        writer.writerow(c)

# Append to contacts.tsv
with open(CONTACTS_FILE, 'a', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=CONTACT_HEADERS, delimiter='\t', lineterminator='\n')
    for c in contacts:
        writer.writerow(c)

print(f"Done: {len(companies)} companies + {len(contacts)} contacts written.")
