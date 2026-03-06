// PATH: apps/web/src/lib/teamPortraits.ts
// WHAT: Central map of optimized team portrait sources for landing surfaces
// WHY:  Keeps hero and team sections on one shared asset contract
// RELEVANT: apps/web/src/components/TeamPortrait.tsx,apps/web/src/components/TeamCarousel.tsx,apps/web/src/components/HeroInteractive.tsx

import averyAvif from '../public/images/team/avery.avif';
import averyJpg from '../public/images/team/avery.jpg';
import averyWebp from '../public/images/team/avery.webp';
import blairAvif from '../public/images/team/blair.avif';
import blairJpg from '../public/images/team/blair.jpg';
import blairWebp from '../public/images/team/blair.webp';
import caseyAvif from '../public/images/team/casey.avif';
import caseyJpg from '../public/images/team/casey.jpg';
import caseyWebp from '../public/images/team/casey.webp';
import jordanAvif from '../public/images/team/jordan.avif';
import jordanJpg from '../public/images/team/jordan.jpg';
import jordanWebp from '../public/images/team/jordan.webp';
import morganAvif from '../public/images/team/morgan.avif';
import morganJpg from '../public/images/team/morgan.jpg';
import morganWebp from '../public/images/team/morgan.webp';
import quinnAvif from '../public/images/team/quinn.avif';
import quinnJpg from '../public/images/team/quinn.jpg';
import quinnWebp from '../public/images/team/quinn.webp';
import rowanAvif from '../public/images/team/rowan.avif';
import rowanJpg from '../public/images/team/rowan.jpg';
import rowanWebp from '../public/images/team/rowan.webp';
import samAvif from '../public/images/team/sam.avif';
import samJpg from '../public/images/team/sam.jpg';
import samWebp from '../public/images/team/sam.webp';
import taylorAvif from '../public/images/team/taylor.avif';
import taylorJpg from '../public/images/team/taylor.jpg';
import taylorWebp from '../public/images/team/taylor.webp';

export const teamPortraits = {
  avery: { avif: averyAvif, webp: averyWebp, jpg: averyJpg },
  blair: { avif: blairAvif, webp: blairWebp, jpg: blairJpg },
  casey: { avif: caseyAvif, webp: caseyWebp, jpg: caseyJpg },
  jordan: { avif: jordanAvif, webp: jordanWebp, jpg: jordanJpg },
  morgan: { avif: morganAvif, webp: morganWebp, jpg: morganJpg },
  quinn: { avif: quinnAvif, webp: quinnWebp, jpg: quinnJpg },
  rowan: { avif: rowanAvif, webp: rowanWebp, jpg: rowanJpg },
  sam: { avif: samAvif, webp: samWebp, jpg: samJpg },
  taylor: { avif: taylorAvif, webp: taylorWebp, jpg: taylorJpg },
} as const;
