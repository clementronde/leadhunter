/**
 * Règles de rédaction des cold emails, tirées des études publiées
 * (et adaptées aux petites entreprises locales françaises) :
 * - Étude « 10 247 cold emails » (14 campagnes, B2B) : douleur nommée en une phrase sous forme de question,
 *   objet < 4 mots, petite demande, P.S. qui laisse une porte de sortie (+18 % de réponses),
 *   emails courts 2,5x meilleurs que les longs, pas de preuve sociale en ouverture, pas de fausse vidéo,
 *   envoi mardi / mercredi 7h30-9h30.
 * - Gong Labs (304 174 emails) : en premier contact, l'appel à l'action « d'intérêt »
 *   (« est-ce un sujet pour vous ? ») bat la demande de rendez-vous à date précise.
 * - Belkins (5,5 M d'emails) : objets de 2 à 4 mots = meilleurs taux d'ouverture.
 * - Instantly / Hunter / Lavender : les meilleurs emails font moins de 80-100 mots, langage simple
 *   (niveau fin de primaire), le 1er email apporte la majorité des réponses, pas de suivi d'ouverture.
 * - Délivrabilité (onglet Promotions) : texte brut, aucun lien ni image dans le 1er email, pas de mots marketing.
 */

export const COLD_EMAIL_RULES = [
  'Objet : 2 à 4 mots, en minuscules comme un message entre collègues, sans emoji, sans point d’exclamation, sans promesse. Il ne résume pas l’email : il donne envie de l’ouvrir (le nom de l’entreprise ou une question courte).',
  'Ouverture : nommer en UNE phrase un problème concret et vrai pour CE type d’activité, sous forme de question (« … est-ce votre cas ? »). Pas de présentation, pas de « Je me permets », pas de flatterie, pas de « J’espère que vous allez bien ».',
  'Ancrer ce problème dans un fait réel fourni (pas de site, note Google, avis, constat d’audit). Ne jamais inventer de chiffre, de client, de résultat ou de référence.',
  'Un seul problème, une seule idée. Pas de liste de services, pas d’argumentaire, pas de preuve sociale (« nous travaillons avec… ») en ouverture.',
  'Corps de 50 à 90 mots hors signature. Phrases courtes, mots simples, vouvoiement, ton humain écrit à la main. Parler de « vous » plus que de « je / nous ».',
  'Une seule demande, la plus petite possible, qui se répond par oui / non : « Est-ce un sujet pour vous ? », « Je vous envoie 2-3 idées en un paragraphe ? », « Ça vaut 10 minutes au téléphone ? ». Jamais de démo ni de rendez-vous d’une heure.',
  'Terminer par un P.S. court qui laisse une porte de sortie, par exemple : « P.S. Si ce n’est pas le moment, aucun souci : je peux revenir vers vous dans quelques mois. »',
  'Aucun lien, aucune image, aucune pièce jointe, aucun mot marketing (offre, gratuit, promotion, exclusif, %, €) : c’est ce qui envoie un email dans l’onglet Promotions ou les spams.',
]

export const SHORT_MESSAGE_RULES = [
  '280 caractères maximum, vouvoiement, écrit comme à la main. Pas d’emoji, pas de lien.',
  'Une observation vraie tirée des faits, le problème en une question, une petite demande (oui / non).',
]

export const SEND_TIMING_TIP = 'Meilleur créneau d’envoi : mardi ou mercredi entre 7h30 et 9h30. À éviter : lundi, jeudi après-midi, vendredi, week-end.'

export function rulesAsPrompt(rules: string[]): string {
  return rules.map((rule) => `- ${rule}`).join('\n')
}
