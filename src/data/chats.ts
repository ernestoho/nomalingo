/**
 * Seeded conversations, plus the scripted reply pool.
 *
 * HONESTY RULE: replies are scripted so the app feels alive without a backend,
 * and the UI labels them as demo replies. Real person-to-person messaging is
 * the first thing the ApiAdapter takes over.
 */

import type { ChatMessage, L } from './types';

export const SEED_CHATS: Record<number, ChatMessage[]> = {
  0: [
    { fromPartner: true, text: '¡Hola! ¿Cómo va el español esta semana?', time: '2:02 p.m.' },
    { fromPartner: false, text: 'Va bien. Practico todos los días un chin 😄', time: '2:04 p.m.' },
    { fromPartner: true, text: 'Ya dijiste «un chin», eso es bien dominicano 🇩🇴', time: '2:05 p.m.' },
    {
      fromPartner: true,
      text: 'Casi perfecto. Solo una cosita 👇',
      time: '2:09 p.m.',
      correction: {
        wrong: 'Yo soy aburrido de esperar',
        right: 'Estoy aburrido de esperar',
        why: {
          es: '«Ser aburrido» es que tú aburres a la gente. «Estar aburrido» es que te aburres tú.',
          en: '"Ser aburrido" means you bore other people. "Estar aburrido" means you are bored.',
        },
      },
    },
    {
      fromPartner: true,
      text: '¿Vas al intercambio del jueves? Es en Los Cubanos.',
      time: '2:13 p.m.',
      meetupId: 'e0',
    },
  ],
  5: [
    { fromPartner: true, text: 'Te mandé la pronunciación de «vaina» 🎙', time: '12:40 p.m.' },
  ],
  2: [
    { fromPartner: true, text: 'Bro, te tengo un dominicanismo nuevo 😅', time: 'Ayer' },
  ],
  3: [
    { fromPartner: true, text: 'Ich übe auch Spanisch — wollen wir zusammen?', time: 'Vie' },
  ],
  6: [
    { fromPartner: true, text: 'Nos vemos en PYHEX el miércoles 👍', time: 'Jue' },
  ],
  7: [
    { fromPartner: true, text: '¿Qué lo que? ¿Practicamos mañana temprano?', time: 'Lun' },
  ],
};

/** Scripted replies. Surfaced to the user as demo behaviour. */
export const SCRIPTED_REPLIES: L[] = [
  { es: '¡Buenísimo! Sigue así 💪', en: 'Nice one, keep going 💪' },
  {
    es: 'Ahí vamos. ¿Practicamos el jueves en persona?',
    en: 'Getting there. Shall we practise in person on Thursday?',
  },
  {
    es: 'Ojo: en dominicano eso se dice más corto 😄',
    en: 'Heads up: in Dominican that is usually shorter 😄',
  },
  { es: 'Te entendí perfecto esta vez.', en: 'I understood you perfectly this time.' },
  { es: '¿Qué lo que? Cuéntame más.', en: 'What is up? Tell me more.' },
];

/** Conversation starters offered as chips in the chat composer. */
export const STARTERS: L[] = [
  { es: '¿Qué lo que? ¿Cómo va tu semana?', en: 'Hey — how is your week going?' },
  { es: '¿Nos vemos en un colmado o prefieres un café?', en: 'Colmado or a café?' },
  { es: '¿Me corriges si digo algo mal?', en: 'Will you correct me if I get something wrong?' },
  { es: '¿Cuál es tu zona? Yo ando por…', en: 'Which area are you in? I am around…' },
  { es: '¿Vas a algún encuentro esta semana?', en: 'Going to any meetup this week?' },
];
