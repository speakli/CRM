# Enrichment Log — companies-enriched.csv
**Date :** 2026-06-02  
**Source :** `companies.tsv` (6 195 lignes)  
**Sortie :** `companies-enriched.csv` (6 195 lignes, même structure + champs enrichis)

---

## Résultats globaux

| Champ enrichi | Avant | Après | Delta |
|---|---|---|---|
| `tagline` | 6 | 6 195 | +6 189 générés |
| `summary` | 56 | 6 195 | +6 139 générés |
| `next_action` | 56 | 6 195 | +6 139 générés |
| `uses_netsoins = Oui` | 0 | 336 | +336 confirmés |
| `uses_netsoins = Non` | 0 | 9 | +9 (Clinalliance OSIRIS) |
| `score_icp` mis à jour | 6 139 | 6 195 | +348 recalculés |
| `website` | 79 | 998 | +919 remplis |
| `linkedin_url` | 0 | 835 | +835 remplis |

### Distribution score_icp finale

| Score | Lignes | Signification |
|---|---|---|
| **2** | 336 | Groupe NETSoins multi-sites — **priorité maximale** |
| **1** | 5 593 | Groupe multi-sites, NETSoins inconnu |
| **0** | 266 | Établissement indépendant |

### Distribution uses_netsoins finale

| Valeur | Lignes |
|---|---|
| Inconnu | 5 850 |
| Oui | 336 |
| Non | 9 |

---

## Méthodologie champ par champ

### `uses_netsoins`
**Règle :** NETSoins="Oui" uniquement si source vérifiable. Deux sources acceptées :

1. **DUI="NETSoins"** dans le TSV source — présent sur 44 des 56 lignes CRM manuelles. Ces lignes avaient été renseignées manuellement par un précédent travail d'enrichissement.
2. **Portails NETSoins dédiés** : `adef.netsoins.com` (ADEF Résidences) et `netsoins.domusvi.com` (DomusVi) — confirmés par recherche web.
3. **Extension aux autres établissements du même groupe** : si le groupe est confirmé utilisateur NETSoins, tous ses établissements dans la base FINESS sont marqués "Oui".

**Groupes confirmés NETSoins (source : DUI + portails) :**
- LNA Santé / Le Noble Âge Retraite (44 établissements dans la base)
- ADEF Résidences (50 établissements — portail `adef.netsoins.com`)
- DomusVi / Domusvi (26 établissements — portail `netsoins.domusvi.com`)
- Fondation Partage et Vie / Partage et Vie (79 établissements — DUI confirmé)
- Colisée France / Groupe Colisée (145 établissements — DUI confirmé sur 4 sites IDF)

**Non marqués "Oui" sans source :**
- Groupe Emeis (ex-ORPEA) : mentionné comme partenaire NETSoins dans certaines sources mais non confirmé formellement. Laissé "Inconnu".
- Groupe Korian (rebrandé Clariane en 2023) : historiquement partenaire, statut actuel incertain. Laissé "Inconnu".
- Groupe ACPPA, Univi, ARPAVIE, Groupe SOS Séniors : aucune source trouvée. "Inconnu".

**Marqués "Non" :** 9 établissements Clinalliance (DUI="OSIRIS" dans le CRM — système concurrent confirmé par la R&D Clinalliance).

### `score_icp`
Calculé selon `icp.md` — score pré-appel uniquement (max 2 avec les données disponibles) :
- **+1** si `type_etablissement = "Groupe"` (avec `nb_etablissements ≠ 1`)
- **+1** si `uses_netsoins = "Oui"`
- Score 3 (score max) réservé aux signaux post-appel — non applicable ici

Les 56 lignes CRM manuelles avaient `score_icp` vide : scores calculés et appliqués.  
Les 6 139 lignes d'import avaient score=1/0 (groupe/indépendant) mais sans prise en compte de NETSoins : 348 scores recalculés (de 1 → 2 pour les groupes NETSoins confirmés).

### `tagline`
Générée depuis les colonnes existantes (`Total de lits`, `city`, `Groupe`, `uses_netsoins`).  
Format : `"EHPAD {lits} lits à {city}, groupe {Groupe}[, utilise NETSoins]"`  
Aucune donnée inventée — uniquement ce qui figure dans le fichier source.

### `summary`
Générée depuis : `Total de lits`, `Taille d'établissement`, `Typologie`, `Groupe`, `nb_etablissements`, `city`, `Département`, `uses_netsoins`.  
Format : phrase descriptive en 1-2 lignes. Pas de fabrication.  
Les 56 lignes CRM manuelles conservent leur summary d'origine (plus riche, rédigé à la main).

### `next_action`
Générée depuis le score ICP si le champ était vide :
- Score 2 → "Contacter le directeur en priorité (cible NETSoins + groupe multi-sites)"
- Score 1 → "Établir le premier contact avec le directeur ou la directrice"
- Score 0 → "Identifier le décideur et évaluer l'intérêt avant contact"

Les 56 lignes CRM manuelles conservent leur next_action d'origine (plus précis, avec noms de contacts).

### `website` et `linkedin_url`
Remplis depuis un référentiel de groupe construit à partir de recherche web (juin 2026).  
**Jamais remplis si non trouvés.** Seuls les URL officiels vérifiés ont été inclus.

| Groupe | website | linkedin_url | Nb lignes impactées |
|---|---|---|---|
| Groupe Emeis | emeis.fr | linkedin.com/company/emeis | 197 |
| Groupe Korian | korian.fr | linkedin.com/company/korian | 164 |
| Colisée France | colisee.fr | fr.linkedin.com/company/colisée-france | 135 |
| Fondation Partage et Vie | fondationpartageetvie.org | fr.linkedin.com/company/fondationpartageetvie | 79 |
| ADEF Résidences | adef-residences.com | linkedin.com/company/adef-residences | 50 |
| Association ARPAVIE | arpavie.fr | — | 38 |
| Groupe SOS Séniors | groupesos-seniors.org | linkedin.com/company/groupe-sos | 37 |
| Groupe ACPPA | acppa.fr | fr.linkedin.com/company/acppa-... | 36 |
| Univi | univi.fr | fr.linkedin.com/company/groupeunivi | 31 |
| Domusvi / DomusVi | domusvi.com | fr.linkedin.com/company/domusvi | 26 |
| LNA Santé / Le Noble Âge | lna-sante.com | fr.linkedin.com/company/groupe-lna-sante | 29 |
| Maisons de Famille | maisons-de-famille.fr | linkedin.com/company/maisons-de-famille | 16+ |
| Clinalliance | clinalliance.fr | — | 9 |
| Alliage Care | alliagecare.fr | — | 9 |
| Croix-Rouge française | croix-rouge.fr | linkedin.com/company/croix-rouge-française | 22+ |

**Note Groupe Korian / Clariane :** Korian a rebrandé en Clariane en juin 2023. Le fichier utilise encore l'ancien nom "Groupe Korian". L'URL korian.fr redirige probablement vers clariane.com — à vérifier et mettre à jour manuellement si nécessaire.

---

## Champs laissés vides — raisons

| Champ | Raison |
|---|---|
| `linkedin_url` (établissements sans groupe connu) | Aucune page LinkedIn individuelle trouvée pour des EHPAD indépendants ou groupes non référencés |
| `employees` | Donnée non disponible dans la base FINESS ; aucune source secondaire fiable et exhaustive |
| `nb_etablissements` (lignes individuelles) | Indiqué au niveau du groupe uniquement quand connu ; non applicable par établissement |
| `DUI` (6 142 lignes) | Non disponible dans la base FINESS ; nécessite une recherche terrain |
| `uses_netsoins` pour 5 850 lignes | Voir ci-dessus — pas de source vérifiable pour ces établissements |
| `revenue` | Non demandé dans le schéma crm-rules.md |
| `notes` | Champ libre réservé aux informations issues d'échanges directs |
| `contacts` associés | Hors scope de ce fichier (fichier contacts.tsv séparé) |

---

## Top 20 cibles prioritaires (score=2)

Ces établissements sont dans des groupes multi-sites confirmés NETSoins — **priorité maximale** selon l'ICP.

| Groupe | Nb d'établissements | Region prioritaire |
|---|---|---|
| Colisée France | 135 | Île-de-France, Auvergne-Rhône-Alpes |
| Fondation Partage et Vie | 79 | National |
| ADEF Résidences | 50 | Île-de-France principalement |
| Domusvi / DomusVi | 26 | Île-de-France + national |
| LNA Santé | 15 | Île-de-France |
| Le Noble Âge Retraite | 14 | Île-de-France |
| Groupe Colisée | 10 | Île-de-France |
| SAS variantes Domusvi | 3 | Île-de-France |

**Recommandation :** Contacter d'abord les directions régionales (ou siège) de Colisée France (135 sites), Fondation Partage et Vie (79 sites) et ADEF Résidences (50 sites). Un accord au niveau groupe = déploiement sur tous les sites.

---

## Limites et points d'attention

1. **NETSoins non confirmé pour Emeis et Korian/Clariane** : ces deux groupes totalisent 361 établissements. Si l'un d'eux est confirmé NETSoins, le score de ~200 lignes passerait de 1 à 2. À vérifier en priorité via NETSoins / Orisha Socialcare directement.

2. **Données FINESS ≠ données commerciales** : certaines lignes classées "Groupe" correspondent à des EHPADs dont le "groupe" est l'entité juridique elle-même (ex : "EHPAD Richard"). Ces établissements ont un score=1 mais ne sont probablement pas des groupes multi-sites au sens commercial.

3. **Korian → Clariane** : le nom officiel est maintenant "Clariane" (depuis juin 2023). Le fichier utilise "Groupe Korian" tel que présent dans la base FINESS. À unifier si nécessaire.

4. **website Emeis** : `emeis.fr` est le site actuel. L'ancien site `orpea.com` est obsolète.

5. **Score post-appel** : les 3 points du score post-appel (surcharge admin, temps soignants, curiosité directeur) ne peuvent être calculés qu'après un échange réel. Champ `score_icp` à mettre à jour après chaque appel.
