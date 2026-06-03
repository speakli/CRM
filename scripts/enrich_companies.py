#!/usr/bin/env python3
"""
enrich_companies.py
-------------------
Enrichit les 56 premières lignes CRM du fichier companies.tsv avec les données
de la base nationale (lignes 57-6195) en faisant correspondre les entrées IDF.

Logique :
1. Pour TOUTES les lignes (CRM + national) : remplissage des champs dérivables
2. Pour les 56 CRM : matching avec les 587 IDF de la base nationale
3. Écriture du résultat (overwrite) avec vérification intégrité

Contrainte : aucune donnée inventée — uniquement ce qui vient du fichier.
"""

import csv
import re
import unicodedata
import sys

TSV_PATH = "/Users/lenisultan/open-source-crm/data/companies_backup2.tsv"
TSV_OUT  = "/Users/lenisultan/open-source-crm/data/companies.tsv"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def strip_accents(s: str) -> str:
    """Supprime les accents via NFD + encode ASCII."""
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()


def normalize_name(s: str) -> str:
    """
    Normalise un nom d'EHPAD pour comparaison :
    - lowercase
    - supprime accents
    - supprime mots parasites : ehpad, residence, résidence, la, le, les, maison, villa
    - supprime ponctuation
    - strip
    """
    s = strip_accents(s.lower())
    # supprime mots parasites courants
    noise = [
        r"\behpad\b", r"\bresidence\b", r"\bla\b", r"\ble\b", r"\bles\b",
        r"\bmaison\b", r"\bvilla\b", r"\bkorian\b", r"\borpea\b", r"\bdomitys\b",
        r"\blna\b", r"\bcolisee\b", r"\bcolisée\b", r"\bmedica\b",
        r"\bd['\s]\b", r"\bde\b", r"\bdes\b", r"\bdu\b", r"\ben\b",
        r"\bsur\b", r"\bsous\b",
    ]
    for pattern in noise:
        s = re.sub(pattern, " ", s)
    # supprime ponctuation
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def levenshtein(a: str, b: str) -> int:
    """Distance de Levenshtein entre deux chaînes (standard Python)."""
    if a == b:
        return 0
    la, lb = len(a), len(b)
    if la == 0:
        return lb
    if lb == 0:
        return la
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        curr = [i] + [0] * lb
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
        prev = curr
    return prev[lb]


def extract_city_from_address(address: str) -> str:
    """
    Extrait la ville depuis une adresse CRM du type :
      '21 avenue des Murs du Parc, 94300 Vincennes'  -> 'Vincennes'
      'Paris 13e, 75013'                              -> 'Paris 13e'
      'Garches, 92380'                                -> 'Garches'
      'Le Bourget, 93350'                             -> 'Le Bourget'
    Retourne '' si non trouvé.
    """
    if not address:
        return ""

    # Format 1: "Texte, 75015 Ville" — ville après le code postal
    m = re.search(r"\b\d{5}\s+(.+)$", address.strip())
    if m:
        return m.group(1).strip()

    # Format 2: "Ville, 75013" — ville avant la virgule+CP (sans rue)
    # ex: "Paris 13e, 75013" ou "Garches, 92380"
    m = re.match(r"^([^,]+),\s*\d{5}$", address.strip())
    if m:
        return m.group(1).strip()

    # Format 3: seulement "Ville Code" sans virgule
    m = re.match(r"^(.+?)\s+\d{5}$", address.strip())
    if m:
        return m.group(1).strip()

    return ""


def extract_cp_from_address(address: str) -> str:
    """Extrait le premier code postal \b\d{5}\b de l'adresse."""
    if not address:
        return ""
    m = re.search(r"\b(\d{5})\b", address)
    return m.group(1) if m else ""


def dept_from_cp(cp: str) -> str:
    """Dérive le code département des 2 premiers chiffres du CP."""
    if not cp or len(cp) < 2:
        return ""
    prefix = cp[:2]
    # DOM
    if cp.startswith("97"):
        return cp[:3]
    return prefix


def dept_from_finess(finess: str) -> str:
    """Dérive le département des 2 premiers chiffres du Finess (forme DDXXXXXXX)."""
    finess = finess.strip()
    if len(finess) >= 2 and finess[:2].isdigit():
        return finess[:2]
    return ""


def clean_phone(phone: str) -> str:
    """
    Nettoie un numéro de téléphone :
    - supprime espaces, tirets, points
    - convertit 0X... en +33X... (format international)
    Retourne '' si vide après nettoyage ou si ça ressemble pas à un num.
    """
    if not phone:
        return ""
    cleaned = re.sub(r"[\s.\-]", "", phone.strip())
    if not cleaned:
        return ""
    # Format international si commence par 0
    if cleaned.startswith("0") and len(cleaned) == 10:
        cleaned = "+33" + cleaned[1:]
    return cleaned


def size_from_lits(lits_str: str) -> str:
    """Calcule la taille d'établissement depuis le nombre de lits."""
    if not lits_str:
        return ""
    try:
        lits = int(re.sub(r"[^\d]", "", lits_str))
    except ValueError:
        return ""
    if lits < 25:
        return "Très petit"
    elif lits < 50:
        return "Petit"
    elif lits < 100:
        return "Moyen"
    elif lits < 200:
        return "Grand"
    elif lits < 300:
        return "Très grand"
    else:
        return "Établissement majeur"


def normalize_city_for_match(city: str) -> str:
    """
    Normalise un nom de ville pour la comparaison :
    - strip_accents + lowercase
    - supprime "arrondissement"
    - strip + collapse spaces
    """
    s = strip_accents(city.lower())
    s = re.sub(r"\barrondissement\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def cities_match(city_a: str, city_b: str) -> bool:
    """
    Retourne True si les deux villes normalisées correspondent.
    Gère le cas Paris XeArrondissement vs Paris Xe.
    """
    a = normalize_city_for_match(city_a)
    b = normalize_city_for_match(city_b)
    if a == b:
        return True
    # Ex: "paris 13e" == "paris 13e" — déjà géré ci-dessus
    # Ex: "paris" == "paris 15e" — non, on ne veut pas ça
    return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # --- Lecture ---
    with open(TSV_PATH, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter="\t")
        all_rows = list(reader)

    header = all_rows[0]
    col = {c: i for i, c in enumerate(header)}
    data = all_rows[1:]  # 6195 lignes de données

    print(f"Fichier lu : {len(all_rows)} lignes (header + {len(data)} données)")
    print(f"Colonnes   : {len(header)}")
    print()

    # --- Séparation CRM / national ---
    crm_rows = data[:56]    # indices 0-55  → lignes fichier 2-57
    nat_rows = data[56:]    # indices 56-6138 → lignes fichier 58-6196

    idf_rows = [r for r in nat_rows if r[col["region"]] == "Île-de-France"]
    print(f"Lignes CRM         : {len(crm_rows)}")
    print(f"Lignes national    : {len(nat_rows)}")
    print(f"Lignes IDF natl    : {len(idf_rows)}")
    print()

    # -------------------------------------------------------------------------
    # Étape 1 : Remplissage des champs dérivables pour TOUTES les lignes
    # -------------------------------------------------------------------------

    def fill_row(row: list, is_crm: bool = False) -> list:
        """Complète les champs dérivables d'une ligne (in-place copy)."""
        r = list(row)  # copie

        # -- Ville : copier city si Ville vide et city non vide
        if not r[col["Ville"]] and r[col["city"]]:
            r[col["Ville"]] = r[col["city"]]

        # -- Adresse : copier address si Adresse vide et address non vide
        if not r[col["Adresse"]] and r[col["address"]]:
            r[col["Adresse"]] = r[col["address"]]

        # -- Code postal : extraire depuis address si Code postal vide
        if not r[col["Code postal"]]:
            cp = extract_cp_from_address(r[col["address"]])
            if cp:
                r[col["Code postal"]] = cp

        # -- Département : dériver de CP ou Finess
        if not r[col["Département"]]:
            cp = r[col["Code postal"]]
            if cp:
                d = dept_from_cp(cp)
                if d:
                    r[col["Département"]] = d
            # fallback: Finess
            if not r[col["Département"]]:
                finess = r[col["Numéro Finess"]]
                if finess:
                    d = dept_from_finess(finess)
                    if d:
                        r[col["Département"]] = d

        # -- Téléphones Clean Export
        if not r[col["Téléphones Clean Export"]]:
            phone = r[col["phone"]]
            cleaned = clean_phone(phone)
            if cleaned:
                r[col["Téléphones Clean Export"]] = cleaned

        # -- Taille d'établissement
        if not r[col["Taille d'établissement"]]:
            lits = r[col["Total de lits"]]
            size = size_from_lits(lits)
            if size:
                r[col["Taille d'établissement"]] = size

        # -- Pour les lignes CRM : extraire city depuis address
        if is_crm:
            if not r[col["city"]]:
                city_extracted = extract_city_from_address(r[col["address"]])
                if city_extracted:
                    r[col["city"]] = city_extracted
            # Après extraction city, mettre Ville si encore vide
            if not r[col["Ville"]] and r[col["city"]]:
                r[col["Ville"]] = r[col["city"]]

        return r

    print("Étape 1 : remplissage champs dérivables...")
    crm_rows = [fill_row(r, is_crm=True) for r in crm_rows]
    nat_rows = [fill_row(r, is_crm=False) for r in nat_rows]
    # Re-calculer idf_rows depuis nat_rows mis à jour
    idf_rows = [r for r in nat_rows if r[col["region"]] == "Île-de-France"]

    # -------------------------------------------------------------------------
    # Étape 2 : Matching CRM ↔ IDF national
    # -------------------------------------------------------------------------

    print("Étape 2 : matching CRM ↔ IDF...")
    print()

    # Pré-calcul des noms normalisés IDF
    idf_norm = [(normalize_name(r[col["name"]]), normalize_city_for_match(r[col["city"]]), r)
                for r in idf_rows]

    match_count = 0
    no_match = []

    FIELDS_TO_COPY = [
        "Numéro Finess", "Groupe", "Typologie",
        "Total de lits", "Prix minimum mensuel",
    ]

    for i, crm in enumerate(crm_rows):
        crm_name = crm[col["name"]]
        crm_city_raw = crm[col["city"]]  # déjà extrait à l'étape 1
        crm_city_norm = normalize_city_for_match(crm_city_raw)
        crm_name_norm = normalize_name(crm_name)

        # Candidats : même ville normalisée
        candidates = [
            (norm_name, norm_city, r)
            for (norm_name, norm_city, r) in idf_norm
            if cities_match(norm_city, crm_city_norm) or cities_match(r[col["city"]], crm_city_raw)
        ]

        best_match = None
        best_score = None  # (distance, type)

        for (norm_name, norm_city, r) in candidates:
            nn = norm_name
            cn = crm_name_norm

            # Critère 1 : containment
            if cn and nn and (cn in nn or nn in cn):
                dist = abs(len(cn) - len(nn))
                score = (0, dist)  # priorité max
            else:
                # Critère 2 : Levenshtein
                dist = levenshtein(cn, nn)
                score = (1, dist)

            if best_score is None or score < best_score:
                best_score = score
                best_match = (norm_name, norm_city, r, score)

        # Seuils de confiance
        matched = False
        if best_match is not None:
            _, _, matched_row, score = best_match
            type_score, dist_score = score

            # Acceptance criteria :
            # - containment (type=0) : la longueur commune (shorter - dist) doit
            #   représenter >= 60% de la longueur du plus court APRÈS normalisation.
            #   Cela évite les faux containment (ex: "parc" contenu dans "parents").
            # - levenshtein (type=1) : dist/shorter <= 0.3 (max 30% d'erreur)
            #   et dist absolu <= 3
            accept = False
            cn_len = max(len(crm_name_norm), 1)
            nn_len = max(len(normalize_name(matched_row[col["name"]])), 1)
            shorter = min(cn_len, nn_len)

            if type_score == 0:
                # containment : la portion non-commune représente dist_score chars
                # Pour être valide : dist doit être < 40% du shorter
                # ex "jardins acacias" vs "jardin acacias": shorter=14, dist=7(diff), overlap=7 -> 50%
                # Mais on veut vérifier que l'overlap est substantiel
                # Méthode : si l'un contient l'autre, la distance = len(longer) - len(shorter)
                # On accepte si le shorter est >= 4 chars et repr. >= 60% du longer
                longer = max(cn_len, nn_len)
                # vérifier que le shorter n'est pas un sous-mot accidentel
                # ex "parc" (4) dans "parents" (7) : shorter/longer = 4/7 = 0.57 < 0.6 -> rejeté
                # ex "jardins acacias" (15) dans "jardin acacias" (14) : ratio = 14/15 = 0.93 -> ok
                ratio = shorter / longer if longer > 0 else 0.0
                accept = shorter >= 4 and ratio >= 0.62
            else:
                # levenshtein : ratio strict <= 0.30 et dist absolu <= 3
                ratio = dist_score / shorter if shorter > 0 else 999
                accept = dist_score <= 3 and ratio <= 0.30 and shorter >= 5

            if accept:
                matched = True
                match_count += 1
                print(f"  MATCH [{i+1:2d}] '{crm_name}'")
                print(f"          ↳  '{matched_row[col['name']]}' | {matched_row[col['city']]} | score={score}")

                # Copie des champs
                for field in FIELDS_TO_COPY:
                    if not crm_rows[i][col[field]] and matched_row[col[field]]:
                        crm_rows[i][col[field]] = matched_row[col[field]]

                # city et region si vides
                if not crm_rows[i][col["city"]] and matched_row[col["city"]]:
                    crm_rows[i][col["city"]] = matched_row[col["city"]]
                if not crm_rows[i][col["region"]] and matched_row[col["region"]]:
                    crm_rows[i][col["region"]] = matched_row[col["region"]]

                # Recalculer Taille après avoir le nombre de lits
                if not crm_rows[i][col["Taille d'établissement"]]:
                    size = size_from_lits(crm_rows[i][col["Total de lits"]])
                    if size:
                        crm_rows[i][col["Taille d'établissement"]] = size

                # Recalculer Département si maintenant on a un CP ou Finess
                if not crm_rows[i][col["Département"]]:
                    cp = crm_rows[i][col["Code postal"]]
                    if cp:
                        crm_rows[i][col["Département"]] = dept_from_cp(cp)
                    if not crm_rows[i][col["Département"]]:
                        finess = crm_rows[i][col["Numéro Finess"]]
                        if finess:
                            crm_rows[i][col["Département"]] = dept_from_finess(finess)

                # Ville depuis city si vide
                if not crm_rows[i][col["Ville"]] and crm_rows[i][col["city"]]:
                    crm_rows[i][col["Ville"]] = crm_rows[i][col["city"]]

        if not matched:
            no_match.append((i + 1, crm_name, crm_city_raw))
            # Quand même mettre region=Île-de-France si ville IDF trouvée
            # (la ville a été extraite de l'adresse, donc c'est IDF)
            # On ne met pas la région sans certitude de matching

    print()
    print("=" * 70)
    print(f"Matches trouvés : {match_count} / {len(crm_rows)}")
    print()
    print("Entrées CRM sans match (nécessite recherche manuelle / internet) :")
    for idx, name, city in no_match:
        print(f"  [{idx:2d}] '{name}' | ville CRM='{city}'")

    # -------------------------------------------------------------------------
    # Étape 3 : Reconstruction et écriture
    # -------------------------------------------------------------------------

    # Pour les CRM sans match mais avec une ville IDF extraite,
    # on peut mettre region=Île-de-France si le CP est IDF (75, 77, 78, 91, 92, 93, 94, 95)
    IDF_DEPTS = {"75", "77", "78", "91", "92", "93", "94", "95"}
    for i, crm in enumerate(crm_rows):
        dept = crm[col["Département"]]
        if not crm[col["region"]] and dept in IDF_DEPTS:
            crm_rows[i][col["region"]] = "Île-de-France"
        if not crm[col["country"]] and dept in IDF_DEPTS:
            crm_rows[i][col["country"]] = "France"

    all_data = crm_rows + nat_rows
    out_rows = [header] + all_data

    # Vérification intégrité
    assert len(out_rows) == 6196, f"Nombre de lignes incorrect: {len(out_rows)}"
    for j, row in enumerate(out_rows):
        assert len(row) == 43, f"Ligne {j+1} : {len(row)} colonnes au lieu de 43"

    print()
    print(f"Lignes totales : {len(out_rows)} (attendu : 6196) ✓")
    print(f"Colonnes par ligne : 43 ✓")

    with open(TSV_OUT, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL)
        writer.writerows(out_rows)

    print(f"Fichier écrit : {TSV_OUT}")

    # -------------------------------------------------------------------------
    # Étape 4 : Statistiques de remplissage
    # -------------------------------------------------------------------------

    print()
    print("=" * 70)
    print("Statistiques de remplissage (lignes CRM, 1-56) :")
    stats_fields = [
        "city", "region", "Numéro Finess", "Groupe", "Typologie",
        "Total de lits", "Prix minimum mensuel", "Ville", "Code postal",
        "Département", "Téléphones Clean Export", "Taille d'établissement",
        "Adresse",
    ]
    for field in stats_fields:
        filled = sum(1 for r in crm_rows if r[col[field]])
        print(f"  {field:<30s}: {filled:3d}/56 remplis")

    print()
    print("Statistiques de remplissage (toutes les 6195 lignes de données) :")
    for field in stats_fields:
        filled = sum(1 for r in all_data if r[col[field]])
        print(f"  {field:<30s}: {filled:4d}/6195 remplis")


if __name__ == "__main__":
    main()
