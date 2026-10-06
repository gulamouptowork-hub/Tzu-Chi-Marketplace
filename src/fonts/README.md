# Noto Sans TC interface subset

`noto-tc-400.woff2` is the original variable subset downloaded earlier from Google Fonts for the characters recorded in `characters.txt`. `noto-tc-regular.woff2` is its locally instantiated 400-weight version, reducing the primary download from 151,640 to 74,624 bytes. The manifest combines the Traditional Chinese translation file, official department catalogue and seed data. The font retains the upstream SIL Open Font License in `OFL.txt`.

The root layout loads the regular file with `next/font/local`; `font-enhancement.tsx` subsequently loads the complete self-hosted Noto Sans TC family for characters outside the subset. Regenerate the subset when interface copy or the official catalogue changes. No browser request is made to Google Fonts.
