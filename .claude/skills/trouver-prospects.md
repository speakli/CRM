# Skill : Trouver des prospects

## Déclencheur
Quand l'utilisateur dit "trouve des EHPAD", "prospecte", "cherche des établissements"
suivi de critères (région, taille, groupe/indépendant, NETSoins, etc.)

## Étapes à suivre dans l'ordre

### 1. Clarifier les critères si nécessaire
Avant de chercher, s'assurer d'avoir au moins un critère exploitable :
- Zone géographique (région, département, ville)
- Type (Groupe / Indépendant / les deux)
- Taille approximative (nombre de lits ou d'établissements)
- NETSoins uniquement ?

Si aucun critère n'est précisé, demander avant de continuer.

### 2. Recherche internet
Lancer plusieurs recherches pour trouver des établissements correspondants.
Croiser les sources : annuaires EHPAD (pour-les-personnes-agees.gouv.fr,
annuaire.action-sociale.org, capgeris.com, ehpad.fr), sites des groupes,
presse spécialisée.

Pour chaque établissement trouvé, chercher :
- Nom du directeur (ou directrice)
- Site web officiel
- Nombre de lits
- Utilisation de NETSoins
- Numéro de téléphone
- Adresse (ville, région)
- Appartenance à un groupe (et lequel)

### 3. Vérifier les doublons dans le CRM
Lire `data/companies.tsv` et exclure les établissements déjà présents.
Signaler ceux qui sont déjà dans le CRM.

### 4. Calculer le score ICP pour chaque établissement
D'après `docs/icp.md`, évaluer les 3 critères pour chaque prospect :
1. Utilise NETSoins ? (+1 si oui)
2. A exprimé un problème de charge administrative ? (+1 si oui — rare à ce stade)
3. Directeur ouvert aux outils numériques ? (+1 si signal trouvé)

### 5. Présenter les résultats sous forme de tableau
Afficher tous les établissements trouvés avant d'écrire quoi que ce soit :

```
📋 [N] prospects trouvés — dis "oui" pour les ajouter au CRM

| Nom | Ville | Type | Lits | NETSoins | Directeur | Score | Déjà CRM |
|-----|-------|------|------|----------|-----------|-------|----------|
| ... | ...   | ...  | ...  | Oui/Non/? | ...      | x/3   | Non      |

⚠️  Déjà dans le CRM (exclus) : [liste si applicable]
```

Si la liste est longue (> 10), demander si l'utilisateur veut tout ajouter
ou sélectionner des établissements spécifiques.

### 6. Attendre la confirmation
Ne rien écrire dans les TSV tant que l'utilisateur n'a pas dit "oui"
(ou n'a pas sélectionné des établissements précis).

### 7. Ajouter dans le CRM
Après confirmation, pour chaque établissement à ajouter :
- Créer une ligne dans `data/companies.tsv`
- Si un directeur est connu, créer une ligne dans `data/contacts.tsv`
- `funnel_stage` = "Premier contact"
- `created_by` = "Claude", `created_at` = date du jour
- `next_action` = "Identifier le bon interlocuteur et établir le premier contact"
  (ou "Vérifier usage NETSoins" si inconnu)

### Conventions à respecter
- IDs : minuscules, kebab-case (ex: ehpad-saint-joseph-lyon)
- Toujours utiliser Python pour écrire dans les TSV (contrôle exact des tabs)
- Ne jamais inventer des informations : mettre "Inconnu" si non trouvé
- `score_icp` = 0 si NETSoins inconnu, même si le prospect semble intéressant
