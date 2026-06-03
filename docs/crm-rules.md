# Règles et conventions du CRM — Speakli

## Ce que signifie chaque colonne

### Entreprises (établissements)
- **name** : nom de l'établissement ou du groupe
- **linkedin_url** : URL LinkedIn officielle de l'établissement ou du groupe
- **industry** : toujours "EHPAD" pour l'instant
- **tagline** : une phrase courte qui résume le contexte (ex: "Groupe de 12 EHPAD, utilise NETSoins")
- **funnel_stage** : étape dans le processus de vente (voir liste ci-dessous)
- **employees** : nombre de soignants approximatif si connu (entier, plage ex: 50-100, ou 200+)
- **uses_netsoins** : est-ce que l'établissement utilise NETSoins ? (Oui / Non / Inconnu)
- **type_etablissement** : Groupe ou Indépendant
- **nb_etablissements** : nombre de sites dans le groupe (vide si indépendant)
- **score_icp** : score de qualification 0 à 3 (calculé selon les critères dans icp.md)
- **city** / **region** / **country** : localisation du siège
- **summary** : 1 à 3 lignes décrivant l'établissement
- **notes** : tout ce qui est utile à savoir
- **next_action** : la prochaine chose concrète à faire avec cet établissement

### Contacts (directeurs et interlocuteurs)
- **name** : prénom et nom
- **job_title** : poste exact (ex: "Directeur", "Cadre de santé")
- **linkedin** : URL LinkedIn personnelle
- **email** : adresse email professionnelle
- **phone** : numéro de téléphone
- **temperature** : niveau d'intérêt actuel du contact (Chaud / Tiède / Froid)
- **recap** : résumé de ce qu'on sait sur lui et de nos échanges
- **next_action** : la prochaine chose concrète à faire avec ce contact
- **source** : comment on l'a trouvé

### Appels et échanges
- **type** : nature de l'échange
- **summary** : ce qui s'est dit, les points clés, les objections
- **next_action** : ce qui a été convenu comme suite

---

## Valeurs fixes par colonne

**funnel_stage** (étape de vente) :
Premier contact → Démo → Négociation → Signé → Perdu

**temperature** (niveau d'intérêt) :
Chaud / Tiède / Froid

**uses_netsoins** :
Oui / Non / Inconnu

**type_etablissement** :
Groupe / Indépendant

**source** (comment le prospect a été trouvé) :
Prospection LinkedIn / Partenaire NETSoins / Recommandation / Inbound / Salon / Événement / Autre

**type d'échange** :
Appel / Démo / Email / Message LinkedIn / Réunion

---

## Conventions de format

- Dates : YYYY-MM-DD (ex: 2026-05-26)
- Identifiants : en minuscules avec des tirets (ex: groupe-korian)
- Pas de virgules dans les champs simples
- `nb_etablissements` : entier uniquement, vide si type_etablissement = Indépendant

---

## Cas particuliers

- Un groupe EHPAD = une seule ligne dans les entreprises, avec le nom du groupe.
  Les établissements individuels du groupe ne sont pas listés séparément sauf si
  vous avez un interlocuteur différent dans chacun.
- Si vous ne savez pas encore si c'est un groupe ou un indépendant, mettez
  funnel_stage = "Premier contact" et notez la question dans next_action.
- Un directeur qui gère plusieurs sites = un seul contact, reliez-le au groupe.
- Le score_icp est mis à jour manuellement (ou par Claude) après chaque échange significatif.
