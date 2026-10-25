# Spot check of 40 sites (12.10)

Task 12.10 of `roadmap/DEVELOPMENT_ROADMAP.md`; spec `.claude/specs/12-Content-readiness.md` FR-22.

- **Date:** 25–26 Oct 2026. **Checked by:** Claude; findings reviewed by the owner.
- **Sample:** 40 site IDs drawn with Python `random.seed(20261025)` and `random.sample(sorted(site_ids), 40)` over `data/csv/sites.csv`.
- **Method:** for each site, up to two linked web sources (Wikipedia and Banglapedia first, then news, government and travel pages; map listings and project files skipped) were opened and compared with the record's name, location, type, era, condition, access and fee. When a source would not load, the next linked source was tried.
- **Limits:** many Bangladeshi news and government sites refuse automated reading (HTTP 403 or a certificate error). Those sources are listed as "not readable" and still need a check in a browser. Some linked sources are bus-fare articles cited for the travel cost, not for the site; they are noted but say nothing about the site.

## Summary

| Result | Sites |
|---|---|
| Consistent with the sources read | 23 |
| Consistent; the record already notes the sources' disagreement | 4 |
| Correction or addition proposed | 2 |
| Could not be checked (no readable web source, or no web source) | 11 |

**Corrections made (owner approved):** JB-CTG-004 (condition), JB-DHK-037 (disagreement recorded).
**Link problems found:** SRC-0321 (404), SRC-0121 (404), SRC-0968 (site suspended).

## Findings by site

### JB-BSL-017 Baraikaran Zamindar Bari
Banglapedia (SRC-0058) lists "Tara Temple and Zamindar Bari (Baroikaran)" among Nalchity's heritage; English Wikipedia (SRC-0149) confirms Baraikaran was the first Backergunge headquarters. **Consistent.**

### JB-BSL-023 Dakua Zamindar Bari
No linked web source other than the Google Maps listing. **Not checked.**

### JB-BSL-027 West Kachipara Zamindar Bari
Bangla Wikipedia's Bauphal page (SRC-0206) names Kachipara only as a union, market and school, with no zamindar house; the record already says the union portal is the only written source. **Consistent.**

### JB-BSL-032 Sonakhali Zamindar Bari
Banglapedia (SRC-0053) lists "Sonakhali Zamindar Bari, Kuthibari at Sapleza" with no detail. SRC-0538 is a bus-fare article. **Consistent.**

### JB-CTG-004 Kaitola Zamindar Bari
Bangla Wikipedia (SRC-0168): founded about 200 years ago by Bishwanath Roy Chowdhury; "দীর্ঘদিন পরিত্যক্ত অবস্থায় থাকায় এর বর্তমান অবস্থা ভগ্নপ্রায়" (long abandoned and now nearly in ruins). The record gives condition `unknown` and says "no source read describes their state". **Corrected (owner approved):** condition `in_ruins`; preservation status and description now cite Bangla Wikipedia.

### JB-CTG-006 Balakhal Zamindar Bari
Dhaka Post and Khaborer Kagoj not readable. Adar Bepari (SRC-0895): founder Jogendra Narayan Roy Chowdhury, "about a hundred years ago", part dilapidated, a descendant lives there. The record already gives both dates and these details. **Consistent; disagreement noted.**

### JB-CTG-010 Koraitoli Zamindar Bari
Adar Bepari (SRC-0892): founded by Harish Chandra Bose, 1220 BS, now ruined and neglected; no fee mentioned. Matches the record (1220 BS, in ruins, no ticket reported). **Consistent.**

### JB-CTG-019 Chandanpura Zamindar Bari (Sajjalela's house)
Rising BD not readable. The Daily Star article (SRC-0784) describes the Darul Adalat building in Chandanpura, not this house. **Not checked;** SRC-0784 does not describe the site.

### JB-CTG-037 Pratappur Zamindar Bari
bdnews24 (SRC-0539): built about 1760 by Ram Sundar and Ramchandra Saha, now neglected and overgrown. Jugantor and Dhaka Post not readable. The record already lists the disputed dates (c. 1760, 1822, c. 1850–60) and founders. **Consistent; disagreement noted.**

### JB-CTG-041 Kamankhola Zamindar Bari
The upazila portal could not be read (certificate error); SRC-0651 is a bus-fare article. **Not checked.**

### JB-DHK-022 Baushkhali Zamindar Bari (Singha Bari)
Ittefaq (SRC-0766): the Singha family settled about 1760; the estate is abandoned; Ballabhdi union, Saltha. **Consistent.**

### JB-DHK-033 Sreefaltali Zamindar Bari
Bangla Wikipedia (SRC-0235): formed from the nine-anna share of Talibabad pargana; boro and chhoto taraf; founder Rahim Newaz Khan Chowdhury. **Consistent.**

### JB-DHK-037 Girish Chandra Sen's Zamindar Bari
The record says the house no longer stands (the book, 2024; Travel News, 2019) and that the former principal's house stands on its site. Vromon Guide (SRC-0988, undated) describes a U-shaped main building in the present tense and says the former principal of Kashiani M.A. Khaleque Degree College "lives in Girish Chandra Sen's zamindar house". The Dhaka Times is not readable; the Travel News site (SRC-0968) is suspended. **Added (owner approved):** the preservation status records the disagreement; the condition stays `lost` until a dated source or visit settles it.

### JB-DHK-053 Nikli Zamindar Bari
No linked web source. **Not checked.**

### JB-DHK-095 Basail Zamindar Bari (Charu Chandra Roy Bari)
Techzoom (SRC-0743): Charu Chandra Roy, paved pond bank, painted walls; no founder or date. **Consistent.**

### JB-DHK-105 Pakutia Zamindar Bari
English Wikipedia (SRC-0321) returns 404. Techzoom (SRC-0743): founded by Ramkrishna Saha Mondal in the early 19th century, three palaces on about 15 acres beside the Lohajang, now BCRG Degree College. **Consistent;** SRC-0321 link broken.

### JB-DHK-108 Kuthi Pachuria Zamindar Bari
No linked web source. **Not checked.**

### JB-KHL-005 Maghia Zamindar Bari
Banglapedia (SRC-0108): "Kali Mandir adjacent to the Zamindar Bari at Maghia". **Consistent.**

### JB-KHL-010 Kashipur Zamindar Bari
English Wikipedia (SRC-0297): KDK union, Jibannagar; built 1861; zamindars Minay and Vinay Kumar; deteriorating, still lived in. The record gives these, including both founder versions. **Consistent; disagreement noted.**

### JB-KHL-020 Naldanga Rajbari and Temples
English Wikipedia (SRC-0313): Raja title to Chandicharan Deb Roy in 1656; temples at Matbati survive "in varying states of preservation". It names Jessore district (the old district); the record's Kaliganj, Jhenaidah is the present one. **Consistent.**

### JB-KHL-025 Dhamalia Zamindar Bari
Bangla Wikipedia's Dumuria page (SRC-0184) lists "ধামালিয়া জমিদার বাড়ি" among its sights. **Consistent.**

### JB-KHL-028 Bhagaban Chandra Saha Zamindar Bari
The Daily Star Bangla article (SRC-0835) covers other Kushtia sights, not this house; SRC-0651 is a bus-fare article. **Not checked;** the record already says no written source describes the house.

### JB-KHL-036 Raja Sitaram Ray's Palace-Fort, Mohammadpur
English Wikipedia (SRC-0330): Raja from 1688; built a moated fortified capital at Mohammadpur. **Consistent.**

### JB-KHL-038 Sreepur Zamindar Bari
Adar Bepari (SRC-0897): only the broken main gate survives; estate founded by Saradaranjan Pal Chowdhury. **Consistent.**

### JB-KHL-052 Bagerhat Zamindar Bari (Kiran Chandra Das's house)
No linked web source. **Not checked.**

### JB-MYM-005 Alexander Castle
English Wikipedia (SRC-0248): 1879 or 1889 (it gives both), built by Maharaja Suryakanta Acharya Chowdhury, now the Teachers' Training College library. **Consistent.**

### JB-RAJ-027 Dharail Zamindar Bari
Bangla Wikipedia (SRC-0121) returns 404; the district portal cannot be read (certificate error). **Not checked;** SRC-0121 link broken.

### JB-RAJ-032 Uttara Gonobhaban (Dighapatia Rajbari)
English Wikipedia (SRC-0161): 1734, Dayaram Roy; now the prime minister's northern residence with a museum (2018). No fee given there; the record's Tk 30 comes from other sources. **Consistent.**

### JB-RAJ-033 Banwarinagar Rajbari
Parjatan Bichitra (SRC-0944): built in the 19th century by Banwarilal Roy of the Tarash estate; government offices now use it. **Consistent.**

### JB-RAJ-039 Hemrajpur Zamindar Bari
Banglapedia (SRC-0083) lists "Hemrajpur Shiva Mandir and Durga Mandir", not a house. The record already says no source describes a surviving house. **Consistent.**

### JB-RAJ-053 Puthia Rajbari
English Wikipedia (SRC-0153): the 1895 palace by Maharani Hemanta Kumari Devi houses a museum; the first zamindar got the Raja title from Jahangir. **Consistent.**

### JB-RAJ-055 Talando Zamindar Bari
Banglapedia (SRC-0086) lists "Talanda Shiva Mandir (1860)" only. Matches the record. **Consistent.**

### JB-RAJ-059 Betkhair Bagerbari Zamindar Bari
Known only from Google Maps. **Not checked.**

### JB-RNG-009 Kamarpara Pyarimadhab Jotdar Bari
Amader Shomoy (SRC-0520): a jotdar house at East Keshalidanga next to Kamarpara Degree College; visited by Princess Maha Chakri Sirindhorn in February 2010. **Consistent.**

### JB-RNG-016 Gharialdanga Zamindar Bari (Raj Mandir)
Banglapedia (SRC-0068) lists "Gharialdanga Zamindar Bari" among Rajarhat's heritage, with no detail. **Consistent.**

### JB-RNG-018 Naodanga Zamindar Bari
Bangla Wikipedia (SRC-0122): Naodanga union, Phulbari; Pramodaranjan Bakshi 'Bahadur'; "বিলুপ্তির পথে" (on the path to extinction, Ittefaq 2017). **Consistent.**

### JB-RNG-031 Gajaghanta Zamindar Bari
The only linked web source (SRC-0678) is a bus-fare article. **Not checked.**

### JB-SYL-003 Bahula Poddar Zamindar Bari
Both Rising BD sources not readable. **Not checked.**

### JB-SYL-008 Radhanand Zamindar Bari
Bangla Wikipedia (SRC-0224): Habiganj Sadar, also called Hatirthan Jamidar Bari; founding date unknown; the family left for Kolkata after Partition. **Consistent.**

### JB-SYL-015 Bhatipara Zamindar Bari
BSS (SRC-0561): mosque built in the late 17th century, though some locals say 1830; English Wikipedia (SRC-0262): 19th century. The record gives all three. **Consistent; disagreement noted.**
