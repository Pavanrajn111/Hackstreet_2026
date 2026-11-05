# Acre — Existing Website Design Blueprint
Read-only audit, 5 November 2026.

This documents the existing site, not a redesign or improvement proposal. No project changes were made.

EVIDENCE
- Observed: static screenshots at 1200px Desktop, 768px Tablet, 390px Phone; targeted hero, intelligence dashboard, and open phone-navigation state.
- Confirmed: saved geometry, colors, typography, responsive settings, component states, links, CMS structures, and existing motion source.
- Interpreted: audience, personality, photographic mood, and visual-impact explanations.
- Not tested: actual browser clicks/keyboard sequences, scroll playback, form delivery, external destination availability, cross-browser video playback, accessibility conformance, or every intermediate width.
- Dynamic screenshot samples: Crop intelligence; “The acre is no longer the smallest unit of farming”; Privacy Policy. Other records were inspected through shared templates/content, not independently screenshot-tested.
- Pixel values are configured CSS pixels unless called calculated or estimated. Auto means content-driven. Component master widths are not universal runtime widths.
- Owner’s Welcome Guide, Customization Guide, and DESIGN SYSTEM canvas are not public website sections.

# A. Design Overview

Acre blends premium agricultural editorial design with field-intelligence precision. Cream and white expanses, forest-green feature panels, oversized tightly tracked Inter, real farm photography, and restrained line graphics create a calm, grounded, confident personality.

The apparent audience is growers, farm managers, agronomists, and agricultural organizations, inferred from content rather than analytics. Copy links observation to better resource and harvest decisions.

Hierarchy:
1. Large medium-weight headline.
2. Dominant photograph, film, or dashboard composition.
3. Small uppercase numbered pill.
4. Narrower, quieter supporting prose.
5. Pill action with an independent circular arrow.
6. Fine rules, metrics, chips, parcel labels, and status dots.

Distinctive signatures: bottom-anchored type over aerial film; cream hero transition with rounded shoulders; botanical dark/light greens; 40px major corners, arches, 24px inner panels, pills; static field-record dashboard; giant impact numerals; scroll-progress workflows; circular connected-field photo diagram; floating fixed navigation; structured dark footer.

Home narrative: emotional landscape → field evidence → company context → intelligence dashboard → services → signals → process → quantified impact → connected-field thinking → grower proof → editorial → conversation.

No shader was found. Film, photography, CSS-like gradients, line icons, and simple geometry create the visual language.

# B. Complete Color Palette

Exact saved palette:
- Dark Green #173F2A: forest panels, dark badges, checked controls.
- Green #426930: secondary brand accent, links, arrow discs.
- Light Green #DDE9D4: pale feature surfaces, ring foreground, dark-context accent.
- Hover Green #1F5237: dark-button hover.
- Warm Accent #E9C46A: warning/status detail, submit-error arrow area.
- Cream #F5F3EA: warm page backgrounds, light actions, testimonial shell.
- White #FFFFFF: white sections, nav, form, on-dark text.
- Dark #10251B: deepest footer/button surface.
- Text Primary #10251B.
- Text Secondary rgba(16,37,27,.66).
- Text Muted rgba(16,37,27,.4).
- Text On Dark #FFFFFF.
- Text On Dark Secondary rgba(255,255,255,.7).
- Panel On Dark rgba(255,255,255,.05).
- Image Scrim rgba(16,37,27,.6).
- Border Default rgba(16,37,27,.14).
- Border On Dark rgba(255,255,255,.16).
- Live #8FD16A.
- Data Bar On Dark rgba(221,233,212,.22).
- Data Bar On Dark Strong rgba(221,233,212,.28).
- Panel On Dark Solid #234935.
- Bar Green Soft rgba(95,143,69,.25).

Additional confirmed inline values:
#5F8F45 energy-ring foreground; rgba(23,63,42,.12) ring track; white at25% healthy-pin halo; Warm Accent at30% warning halo; #999999 select chevron; #0099FF focused checkbox border. The blue focus state is configuration-confirmed, not live-tested. Transparent wrappers must not be painted white.

Primary text and footer share the deepest dark; forest panels are visibly greener. Alpha colors must remain alpha values, not be flattened to opaque HEX.

Gradients:
- Home hero:180deg, dark rgba(16,37,27,.42)0%, transparent26%, .18 at54%, .72 at100%.
- Dashboard map:180deg, same dark .30 at0%, .10 at40%, .55 at100%.
- Crop ring: conic from0deg, Light Green0–338deg; white16%338–360deg.
- Home image overlay:180deg, dark .50 at0%, .08 at38%, .78 at100%.
- Service Card base:180deg, dark .30 at0%, .05 at35%, .82 at100%.
- Service Card interaction tint:180deg, forest .55 at0%, forest .35 at35%, deepest dark .90 at100%.
- CTA:180deg, forest .35 at0%, .86 at100%.
- Signal image:0deg, darkest .72 at0%, transparent at55%.
- Water ring: forest0–295deg; forest12%295–360.
- Energy ring:#5F8F45 0–230deg; forest12%230–360.

Shadows:
- Raised card:0 18px 40px -18px rgba(16,37,27,.30).
- Contact form:same geometry at.22 alpha.
- Navigation:0 10px 30px -18px rgba(16,37,27,.35).
- Diagram core:0 24px 50px -20px rgba(23,63,42,.60).
- Map pin halos:0 0 0 4px white25% or Warm Accent30%.
Most cards rely on surfaces/rules, not shadows.

States:
Dark pill deepest-dark→Hover Green; disc Green→Light Green and arrow dark.
Light pill Cream→White; disc→Dark Green.
Light nav primary→Green hover/current. Dark nav White→Light Green.
Footer white70→white. Checked interest Dark Green/white check.
Submit success Dark Green/check; error dark outer pill/Warm Accent arrow.
No user-selectable theme switch was observed.

# C. Typography System

Public family:Inter, normal. Most headings500, Stat Card600. Body definitions without explicit weight inherit regular;400 is a recreation default, not a separately stored value everywhere.
Caveat34/600 belongs only to the owner’s guide.
Saved Inter uses alternate forms for6,9,3,a. Match the same font build/character forms.

Exact scale, Desktop / Tablet / Phone:
Display128/88/54px,500,tracking-.055em,line.92em.
Heading1 96/68/44,500,-.05em,.98em.
Heading2 72/52/38,500,-.045em,1em.
Heading3 28/26/24,500,-.03em,1.1em.
Heading4 20/20/18,500,-.02em,line not explicit.
Title Large44/36/30,500,-.04em,1.05em.
Lead34/26/22,inherited regular,-.03em,1.22em.
Quote52/40/30,500,-.04em,1.1em.
Display Number200/132/96,500,-.04em,.95em.
Stat64/52/44,500,-.03em,1em.
Stat Card52/40/32,600,-.03em,1em.
Body Large20/19/18,inherited regular,-.01em,1.4em.
Body17/17/16,inherited regular,normal tracking,1.55em.
Body Small15 all modes,regular,1.5em.
Caption13 all modes,500,1.4em.
Label/Eyebrow12 all modes,500,.14em,uppercase,line not explicit.
Navigation15/15/18,500.
Button15 all modes,500,1em.
Article H2 36/32/28,500,-.035em,1.1em.
Article H3 24/22/20,500,-.025em,line not explicit.
Article Paragraph19/18/17,regular,1.6em,secondary color.
Card Title28/26/24,500,-.03em,1.1em.
Logo Large28/26/24,500,-.03em,1.1em.
Logo Small20/20/18,500,-.02em;Tablet/Phone1.2em,Desktop not explicit.

Home hero/closing film:Display. Inner heroes:Heading1. Contact title/404 message:Heading2, an actual exception. Section headings:Heading2. Cards:Heading3/Card Title. Giant impact:Display Number. Prose:separate article styles.

Tight line boxes and negative tracking create scale without heavy weight. Display128×.92=117.76px linebox, a calculation, not an extra margin. Some heading presets store40px paragraph spacing; do not apply that as a universal margin to every standalone title.

Most copy is left-aligned.404 is deliberately centered. Match actual font,width,copy for line wrapping; do not add arbitrary hard breaks solely to copy one viewport.

Links:
Light nav dark→Green,no underline,.2s cubic-bezier(.44,0,.56,1).
Dark nav White→Light Green,same.
Body links underlined,offset.3em,Green hover.
Footer white70→white,.2s.
Arrow Link label+diagonal icon,gap8px,bottom spacing/rule8px.



# D. Page-by-Page Structure

Common shell:one fixed navigation,route content,one in-flow footer. Home coordinates a page-specific transparent/solid nav appearance; do not render two visible navbars.

Home /:
Hero → From the Field → About → Agriculture Intelligence → Services → Signals → How It Works → Impact → Our Approach → Testimonial → Insights → CTA → Footer.

About /about:
Hero/image trio → Our Story → Mission and Vision → Values → Journey → Team → CTA → Footer.

Services /services:
Hero/wide photo → Service List → How It Works → Why Acre → FAQ → CTA → Footer.

Insights /insights:
Editorial hero and3-article grid → CTA → Footer.

Contact /contact:
Information/form → Image Band → FAQ → Footer. No closing film CTA.

404 /404:
Centered error message/routes out → Footer. No CTA.

Service /services/{slug}:
Hero → Details(deliverables,Overview,Capabilities,Results,How it works) → More Services → CTA → Footer.

Article /insights/{slug}:
Article Header → Article Body → CTA → Footer.

Legal /legal/{slug}:
Policy Hero → Policy Body → Footer. No CTA.

Content sets:Services4,Insights3,Team4,Testimonials1,FAQs9,Legal4.
The slider defines3slides separately; this is not evidence of3CMS testimonial records.

Services:
crop-intelligence;precision-farming;smart-irrigation;soil-resource-management.
Articles:
the-acre-is-no-longer-the-smallest-unit-of-farming — Precision agriculture,18September2026.
irrigating-by-need-not-by-calendar — Water management,29August2026.
seeing-stress-before-the-leaf-does — Crop intelligence,7August2026.
Legal:
privacy-policy;terms-of-service;cookie-policy;accessibility-statement.

Technology is /#technology on Home,not a separate page. No pricing,account,search,application dashboard,or newsletter page was observed.

# E. Detailed Section Analysis

## E0. Shared navigation
Fixed to viewport top,full-width outer wrapper,above normal content. Not a sticky section. Interior heroes compensate with large top padding.

Desktop/Tablet:outer padding14px28px;centered capsule max1384px;radius36px;solid white fill,1px default border,soft nav shadow. Bar padding8px top/right/bottom,20px left. Top row44px. Approximately60px row-plus-padding bar height is a calculation,not a separately fixed declaration.

Logo left:outlined circular sprout+Acre wordmark,gap10px. Dark/light source mark 30/36px. Links About,Technology,Services,Insights,gap36px. Contact pill right. Logo returns Home.

Home Desktop/Tablet initially transparent/light over film. Scroll mapping:Hero→Transparent,From the Field→Solid,threshold.5,replaytrue. Solid is white/bordered. Phone starts solid.

Phone:outer10px14px,bar radius28px,closed height62px,insideleft16px/other8px. Desktoplinks hidden. Logo,Contact,and44px circular menu remain. Open expands the same white capsule downward;Menu→X;five ruled rows About,Technology,Services,Insights,Contact. Drawerpadding12px12px12px0. Spring.4s,bounce0. Not an invented full-screen modal. Keyboard/focus/route-close behavior not live-tested.


## E1. Home

### E1.1 Film hero — “Grow with intelligence.”
Purpose: an emotional, field-scale introduction to the intelligence proposition.

Full-width section, height 100vh, minimum 640px. Film and scrim occupy background layers. Copy is bottom-anchored within a centered, maximum-1328px wrapper, not vertically centered. Desktop copy group is constrained to roughly 860px maximum.

Padding: Desktop 0 56 112 56px; Tablet 0 32 104 32px; Phone 0 20 96 20px.
Eyebrow: “Agriculture / Intelligence.”
Headline: white Display type.
Lower row: “Better insights for healthier fields, smarter resources, and stronger harvests.” plus the light “Explore our approach” pill.
Desktop/Tablet separate description left and action right. Phone stacks them with 24px separation.

Aerial crop-field/country-road film is muted, autoplaying, looping, cover-fit, without controls. Poster is 1920×1080. Four-stop scrim protects the bottom text while retaining landscape detail. A 48px-high Cream cap sits at the bottom, with 48px top-left/top-right corners.

Configured entrance: heading/group immediate, eyebrow delayed 0.1s, lower row 0.5s; all use the common 1s fade-up, once. Static references do not prove playback.

Interpreted impact: oversized low-anchored typography and uninterrupted aerial scale create cinematic hierarchy; eyebrow and action remain compact.

### E1.2 From the Field — 02
Cream. “Agriculture is changing.” Supporting line: “From soil to harvest, better decisions begin with better visibility.”
Desktop top/bottom padding 72/120px; Tablet 56/80px; Phone 40/56px, with normal side gutters.

Three evidence cards: approximately 2:1:1 Desktop; three equal Tablet; stacked Phone.
1. Field intelligence: White shell, radius 40px, inset 8px, image radius 32px, Live field view chip, title/subtitle. Phone photo is 260px high.
2. Resource efficiency: Light Green, radius 40px, padding 32px; concentric Water/Energy rings and −18% inputs used.
3. Crop performance: Dark Green, radius 40px, padding 32px; +24% yield season-on-season and compact bars.

Figures are existing marketing content, not verified live measurements.

### E1.3 About preview — 03
White. “Rooted in agriculture. Built for what’s next.”
Desktop text/image columns have 112px gap; Tablet retains two columns; Phone stacks.

Lead copy: “We started in the field, not the lab. Every tool we build begins with a simple belief: the people who work the land deserve to see it clearly, and to act on what they see with confidence.”
Arrow action: More about us.

Tall arched terrace/mountain landscape. Cream 15+ / Years of field experience and forest 24/7 / Field intelligence badges intentionally overlap the image edges. Badge radius 24px, padding 20px 24px; Phone 14px 16px. Source widths 160px/158px do not fix the image width.
Phone section padding is 60px 20px, not the nearby 48px rhythm.

### E1.4 Agriculture Intelligence — 04
Inset forest panel. “See more. Grow smarter.”
Outer gutters 28/16/12px; panel radius 40/40/28px.
Typical inner vertical spacing 112/72/56px; horizontal 56/32/20px.
Copy: “One living picture of the field: health, soil, water and weather, read together.”

Main row: large image-based field map left, narrow metric stack right, approximately 2:1 Desktop. Lower row contains three data panels.
Map: vineyard/green hill/lake photo under a scrim; Live 148 ha; Moisture 31%; Parcel A-04 Healthy; Parcel C-11 Check; healthy/warning halo pins; Low-to-High vigour legend.
Right: 94% crop-health conic ring; water 82%, soil 91%, temperature 27°C readings.
Bottom: Field activity at 06:40, 09:15, 13:02; Soil Moisture 31% with seven Monday–Sunday bars; five-day forecast 27°,28°,25°,21°,24°, including rain Thursday.
Internal cards use 24px corners, on-dark rules, translucent/solid greens.

Tablet preserves the broad arrangement; Phone stacks major pieces. Pins stay relative to the photograph. No live farm API or map SDK was established.

### E1.5 Services — 05
Cream. “Everything your field needs.” All services link.
Four cards, 2×2 Desktop/Tablet, one column Phone: Crop intelligence, Precision farming, Smart irrigation, Soil & resource management.

Photo fills the card; number at top; title/summary at bottom; dark lower gradient; separate circular arrow. Master 560×560px, padding 36px, radius 40px. Instances fill their grid and can override geometry.
Hover: photo 1.06 scale, arrow 45° turn, scrim change, 0.8s brand easing. This belongs to linked cards only.

### E1.6 Signals — 06
Light Green. “One field. Multiple signals.”
Choices: Crop health 94%; Soil condition 91%; Water usage −18%; Weather 27°C; Field activity 24/7.
Ruled list pairs labels/values with stronger active emphasis. Large photo has a lower dark fade, oversized metric, caption, and asymmetric rounding.

Desktop source 1448×760px, horizontal gap 96px. Tablet horizontal source height 640px, gap 32px. Phone vertical/auto, list above image, gap 32px.
Five explicit content states exist in each responsive arrangement. Click switches image/metric/caption. Component transition 0.7s brand easing. No autoplay found.

### E1.7 How It Works — 07
White. “From field to insight.”
Connect → Observe → Analyze → Act, each with number, title, description, image, dot.
Images depict connection/sensing, aerial observation, rooted crops in hands, and field work/tractor activity.
Four columns Desktop, 2×2 Tablet, one Phone. Default image aspect 0.67, radius 24px; Small image height 314px. Intrinsic source ratios vary; cover cropping is intentional.
Line, dots, text opacity, and image clip follow scroll. No pinned/sticky section.

### E1.8 Impact — 08
Inset deep-dark panel. “Better farming starts with better decisions.” includes a Live-green highlighted phrase.
Four Metric Rows:
- 10K+ Fields monitored.
- 2.4M+ Acres analyzed.
- 32% Resource efficiency.
- 94% Crop visibility.

Display Number scale, 1px on-dark rules, 20px vertical row padding. Desktop/Tablet value left and label lower-right; Phone value above label, gap 8px. Configured counting/rolling does not imply live statistics.

### E1.9 Our Approach — 09
Cream. “Everything is connected.”
Desktop text left/diagram right, gap 60px, diagram footprint 600px. Tablet/Phone stack.
Thin/dotted concentric rings; dark center “Data / One field record”; circular photographs Water, Crop, Soil, Harvest.
Desktop photos about 150px, 5px Cream outlines, small overlapping white caption pills. Core shadow 0 24px 50px −20px at forest60%.
Reduce the existing composition on Phone, not replace it with a generic feature grid.

### E1.10 Testimonial — 10
White. “From a grower.”
Cream shell, radius 40px, padding 8px. Photo and quote horizontal Desktop/Tablet, vertical Phone. Quote icon, divider, avatar/attribution, three indicators with elongated active mark, previous/next circles.

Slide 1: “When you can see what is happening in the field, you can make better decisions.” Daniel Okafor, Farm Manager, Riverbend Growers.
Slide 2: “We stopped watering by the calendar. Now the data tells us when.” Lukas Hoffmann, Head Grower, Sunfield Nurseries.
Slide 3: “I farm the same land my father did. Now I can see it the way he always felt it.” Wei Chen, Owner, Hillside Farm.

Transition is configured at 0s. No autoplay found. Surrounding Home section height 856px Desktop/Tablet, auto Phone: an actual exception.

### E1.11 Insights — 11
Cream. “Ideas from the field.” All field notes link.
Desktop featured article left plus two compact rows right. Tablet featured above two cards. Phone all stacked.
Image, uppercase category, title, excerpt where configured, directional affordance.
Featured image radius 40px; compact 24px. Hover scale 1.06 Featured, 1.08 Compact; 0.6s brand easing. Three existing articles. No author/search/filter/pagination module observed.

### E1.12 Closing film CTA
Used on Home, About, Services, Insights, service detail, article detail; not Contact/404/Legal.
Outer/bottom gutter 28/16/12px. Panel height 760px Desktop/Tablet, 640px Phone; radius 40/40/28px.
Master internal padding 72px Desktop, 28px Phone. Lower-aligned content capped 1240px, gap 28px.

“Let’s grow something better.”
“Bring smarter decisions to every field.”
“Start a conversation.”

Same field film; forest35%-top to86%-bottom gradient. This is an inset cinematic panel, not another full-viewport hero.



## E2. About

### E2.1 Hero and image trio
Cream background. The About / Who We Are label precedes “Rooted in the field. Built for what’s next.” in Heading 1, then a supporting paragraph.

Padding: Desktop 200px 56px 112px; Tablet 144px 32px 80px; Phone 112px 20px 64px.

Three mixed-height field-work photographs align along their lower edge. Rounded and arched crops create the asymmetry. Desktop wrapper height is 560px; Tablet/Phone auto. Gaps are 20 / 16 / 10px. The three-image composition deliberately remains horizontal on Phone rather than becoming three full-width images.

### E2.2 Our Story
White, label 01. Desktop puts a small cue left and a larger statement right; Tablet/Phone stack. Word emphasis follows scroll. Four statistics are 15+, 10K+, 2.4M+, 24/7. They remain four across on Tablet and become 2×2 on Phone. Standard section padding applies. “Our Story” is a descriptive public-content label, not an invented additional section.

### E2.3 Mission and Vision
Inset Dark Green, label 02, “Driven by purpose. Focused on the harvest.” Introductory copy leads to an aerial farm/river photograph and two Statement Cards.

Desktop: photo left, cards stacked right. Tablet: wide photo above two side-by-side cards. Phone: photo and both cards stacked. Cards have 24px corners, 32px default padding, 5%-white surface, 1px on-dark border. Mission: “Make every field legible.” Vision: “Farming that gives back more than it takes.” Preserve outer gutters and panel radius.

### E2.4 Values
White, label 03, “What we hold to.” Four Cream cards: Clarity first; Field-proven; Respect for resources; The long view. Each combines a line icon, title, and prose. Source size 280×340px; padding 28px; radius 24px. Grid 4 / 2 / 1 columns. These are not linked cards; no invented hover zoom.

### E2.5 Journey
Cream, label 04, “Fifteen seasons in the making.” Milestones: 2011 Founded; 2016 First platform; 2021 Scale; 2026 Today. Four/two/one columns. Thin progress line and dots use the workflow’s scroll language. Source step has 32px top padding and 12px gaps. Not a sticky/pinned slideshow.

### E2.6 Team
White, label 05, “The people behind the data.” Intro above:
- A. Mensah — Chief Agronomist.
- L. Brandt — Head of Field Data.
- S. Reyes — Irrigation Lead.
- K. Tanaka — Grower Partnerships.

Grid 4 / 2 / 1. Display portrait ratio 4:5, radius 40px. Name/role below, 10px spacer and compact 6px inter-item rhythm. Intrinsic portrait ratios vary; cover cropping is intentional. No member-detail route or decorative hover was observed. CTA and footer follow.

## E3. Services

### E3.1 Hero
Cream, Services / What We Do, “Everything your field needs.” Summary describes four services and one field record. Heading and summary share an editorial row where space permits. Wide photo below: height 640 / 460 / 320px; corners 40 / 40 / 28px. Lower-left chips: “148 ha in view” and “4 services. 1 record.” Standard inner-hero padding.

### E3.2 Directory
White, label 01, “Pick a starting point.” Four ruled Service Rows in the existing order. Each includes number, title, summary/tags, photograph, arrow.

Desktop: 36px vertical padding, 48px gap, 300×220px thumbnail, radius 24px.
Tablet: 36px vertical padding, 20px gap, 150×116px thumbnail, radius 18px.
Phone: vertical layout, 28px vertical padding, 16px gap, full-width 220px-high image, radius 24px. Separate circular arrow is hidden; the linked row remains the navigation affordance.

### E3.3 Process
Cream, label 02. Shared Connect → Observe → Analyze → Act content. Four/two/one columns, illustrated images and coordinated progress treatment.

### E3.4 Why Acre
Light Green, label 03, “Built around how farms actually run.” Headline left; four numbered, ruled reasons right:
One record, every service; Works with your equipment; An agronomist on your side; Measured, not assumed.
Default number/body gap 32px and vertical row padding 32px. Responsive stacking gives prose the available width.

### E3.5 FAQ
White, label 04, “Before you ask.” Heading beside accordion list on larger layouts:
1. Do I need to take all four services?
2. How long does setup take?
3. Will it work with my existing equipment?
4. Is it suitable for smaller farms?
5. Who owns the data?

Question row padding 24px vertically; gap to icon 24px. Open answer padding 0 48px 24px 0. Top rule, plus/minus, open/closed variants, single-open coordination. CTA/footer follow.

## E4. Insights index
Cream, Insights / Field notes, “Ideas from the field.” Supporting copy and three-article grid belong to the main hero/content section. Grid: 3 columns Desktop, 2 Tablet, 1 Phone. Cards preserve existing photo/category/title/excerpt treatments.

No filter, search, pagination, or load-more was observed. The page contains the three saved articles, then CTA/footer. Main padding: 200px 56px 120px / 144px 32px 80px / 112px 20px 64px.

## E5. Contact

### E5.1 Information and form
Cream. Desktop information left/form right, approximately 1:1.2, gap 96px. Tablet/Phone stack. Title “Let’s grow something better.” uses Heading 2. Existing copy promises a reply from an agronomist within one working day; this is not an operationally verified claim.

Left contact rows:
EMAIL hello@example.com.
PHONE +1 (000) 000-0000.
OFFICE 12 Riverbend Road, Your City.
HOURS Mon–Fri 7:00–18:00.
These are existing template values, including placeholders.

Form shell: White; radius 40px Desktop/Tablet, 28px Phone; padding 48px Desktop/Tablet, 24px Phone; gap 20px; shadow 0 18px 40px -18px rgba(16,37,27,.22).

Name + Email share the first row; Company + Area the second. Phone stacks inputs.
Fields: 52px high, padding 14px 16px, radius 14px, Cream fill, 1px default border. Focus White fill and Green border.
Name and Email required; Company and Area optional. Email uses email semantics. Required Message textarea is 150px high.
Placeholders: Your name; you@farm.com; Farm name; Tell us about your fields.
Area options: Select; Under 100 ha; 100–500 ha; 500–2,000 ha; Over 2,000 ha. Chevron #999999.

Interests: four service-area checkbox choices. Checkbox 18×18px, radius 5px, Cream/default border; checked Dark Green/white check. Focus border configured #0099FF. Choices wrap on larger sizes and form a vertical list on Phone.

Submit pill follows all fields. States: normal, Sending…, success/check, error/Warm Accent arrow. No submission was made. Destination, server validation, and real delivery responses remain unverified.

### E5.2 Image Band
White section with wide rounded river-through-farmland sunset photograph. Lower-left chips “Field team available” and “On-farm visits by appointment”; Phone stacks chips. It is not an embedded map or location widget.

### E5.3 FAQ
Cream, “Before we talk.” Four questions:
What happens after I send a message?
Is the first conversation free?
Can you visit the farm?
I already use another platform. Can I switch?
Same accordion system. Footer follows directly; no film CTA.

## E6. Service detail
Sample: Crop intelligence; all four services share structure.

### E6.1 Hero
Cream. Breadcrumbs Home / Services / current service; numbered service pill; Heading 1; summary; Talk to an agronomist action.
Image height 640 / 460 / 320px, radius 40 / 40 / 28px.
Sample chips: Updated every pass; Parcel-level detail.

### E6.2 Details
White. Desktop left Cream deliverables panel and larger right editorial column. Left panel is not sticky. “What you get,” four checked rows, CTA. Narrow layouts stack in normal flow.

Right content:
- Overview 01: “See stress days before the eye can.” and two paragraphs.
- Capabilities 02: four numbered title/description cards, 2 columns Desktop, 1 Tablet/Phone. Border 1px, radius 24px, default padding 32px, gap 10px.
- Results 03: sample 6 days, 94%, 3x with labels. 3 columns Desktop, 2 Tablet with final wrapped, 1 Phone.
- How it works 04: Capture, Compare, Direct. Three numbered ruled steps; number/body horizontal on larger modes, stacked Phone.

Content is service-specific. Do not copy the sample’s metrics onto other records.

### E6.3 More Services
Cream, label 05, “Keep exploring.” Two-column Service Card grid Desktop/Tablet; one Phone; All services link. Inspected list includes all four services, including current service. It is not an assumed exclude-current filter. CTA/footer.

## E7. Article detail
Sample first article. Cream header: All field notes back link, Precision agriculture category, 18 September 2026 date, Heading 1 title, excerpt capped around 570px, wide cover.
Cover height 640 / 460 / 300px, radius 40 / 40 / 28px.
Header padding 200px 56px 72px / 144px 32px 56px / 112px 20px 40px.

White body padding 112px 56px 120px / 80px 32px / 64px 20px. Prose maximum 760px, aligned to left edge of larger 1328px container, not independently centered.
Sample headings From fields to zones and What it takes, with paragraphs. Dedicated article styles.
No author bio, share rail, read-time module, comments, or related-article section observed. CTA/footer follow.

## E8. Legal detail
Sample Privacy Policy. Cream header: Legal / Policy, Heading 1 title, summary, last updated 1 October 2026. White body max 760px, same left alignment as article. Sample headings: What we collect; How we use it; Your choices; Template notice. Preserve rich heading/paragraph hierarchy. Four legal records use the template. No CTA.

## E9. 404
Cream, centered, auto height/minimum 100vh. Display Number “404”; Heading 2 “Nothing growing here.”; narrower centered description. Main Back to home pill; secondary underlined See our services. Row Desktop/Tablet, stack Phone.

Padding D 160px 24px 96px; T 144px 24px 96px; P 160px 24px 96px.
Gap 24 / 20 / 16px. Fixed nav/footer remain. No additional illustration or CTA.

## E10. Footer
Full-width #10251B.
D padding 96px 56px 28px, major gap 96px.
T 80px 32px 24px, gap 72px.
P 64px 20px 24px, gap 56px.

Desktop brand/light logo and “Agriculture, reimagined.” left; three columns right, thin on-dark vertical separators:
Navigate: Home, About, Technology, Services, Insights, Contact, 404.
Services: four service destinations.
Follow: Instagram, LinkedIn, X.
Follow is text links, not social icons. Column labels uppercase 12px; body links white70%, hoverwhite.

Tablet brand above three columns. Phone Navigate/Services two columns, Follow below. Footer links do not collapse into accordions.

Bottom full-width divider, © 2026 Acre. All rights reserved., and Privacy Policy / Terms of Service / Cookie Policy / Accessibility Statement. Desktop/Tablet distribute copyright/legal across a row; Phone stacks and wraps. No newsletter, cookie-consent overlay, or extra social-icon row observed.



# F. Component Inventory

Thirty reusable canvas definitions plus the external video element were inspected. Source definitions do not prove every appearance is visible everywhere. Geometry appendix lists master sizes; instances can override them.

- Logo — Dark/Light; sprout circle + wordmark, gap10px, mark30/36px.
- Button — Dark/Light plus hover; padding6px6px6px20px, gap14px, 40px arrow disc, radius999px.
- Section Label — On Light/On Dark; outlined pill, padding8px14px, gap8px, uppercase12px.
- Chip — With Dot/Plain; Image Scrim fill, on-dark1px border, padding8px14px.
- Navbar — Solid/Transparent/Phone/Phone Open; fixed floating capsule, expanding drawer.
- Footer — Desktop/Tablet/Phone; brand, navigation, services, follow, legal.
- Service Card — Default plus hover; master560px square, radius40px, padding36px, zoom/arrow rotation.
- Insight Card — Featured/Compact plus hover; vertical/horizontal, image corners40/24px.
- Team Card — Default; 4:5 image, radius40px, name/role.
- Value Card — Default; Cream, radius24px, padding28px, master height340px.
- Stat — On Light/On Dark; top rule, default padding20px0px0px, gap10px.
- FAQ Item — Open/Closed; question, plus/minus, answer, spring0.4s.
- Process Step — Default/Small; number/title/text/photo/dot; image24px corners.
- CTA Banner — Desktop/Phone; film, scrim, headline/action; height760/640px.
- Submit Button — Default/Pending/Success/Error; state labels/icons/colors.
- Arrow Link — On Light/On Dark; label+diagonal arrow, gap8px, lower spacing/rule8px.
- Signal Explorer — five signals in three arrangements; image/metric/caption states.
- Testimonial Slider — three slides in three arrangements; Cream40px shell, padding8px, image/quote/attribution/controls.
- Statement Card — Default; translucent dark panel, radius24px, padding32px.
- Reason Item — Default; number/body, default gap32px, padding32px vertically.
- Capability Card — Default; number/title/prose, border1px, radius24px, padding32px.
- Service Step — Default/Stacked; reusable ruled numbered step, horizontal/vertical.
- Service Row — Desktop/Tablet/Phone plus larger-screen hovers; linked ruled directory row.
- Field Card — Default/Tablet/Phone; White40px shell, inset8px, image32px; Phone image260px.
- Efficiency Card — Default/Phone; Light Green40px, padding32px, concentric rings.
- Performance Card — Default/Phone; forest40px, padding32px, metric/bars.
- Metric Row — Default/Phone; padding20px vertically; Phone value above label/gap8px.
- Forecast Day — Default/Rain; day/icon/temperature, gap8px.
- Journey Step — Default; year/title/prose/dot; top32px, gap12px.
- Stat Badge — Light/Dark/Phone Light/Phone Dark; radius24px, master width160/158px; padding20px24px or14px16px.

## F1. Button construction
Separate label and icon disc, not an arrow character appended to text. Label15px/500/1em; disc40×40px; arrow artwork about16px. Outer padding yields approximately52px height.

Dark outer #10251B, Green disc. Hover outer Hover Green, disc Light Green/dark arrow, 45° turn. Light outer Cream→White, disc→Dark Green. Spring0.4s, bounce0.1. No separately confirmed Pressed appearance.

## F2. Borders and nesting
Preserve all1px strokes: nav, pills, chips, FAQ, directory, capabilities, metrics, dashboard, footer, timelines, circle diagram. Field Card40px outside/32px inside/8px inset and testimonial40px shell/8px inset are intentional nested treatments. Hover and parallax remain clipped within their rounded frames.

Only linked/actionable elements receive hover responses. Team, Value, and static informational/data cards do not gain invented float/zoom/elevation states.

## F3. Icons
Consistent fine-line symbols include Sprout, Arrow Up Right, Menu, X, Plus, Minus, Check, Quote, Arrow Left/Right, Sun, Cloud Rain, and contextual value icons. A matched Lucide-style React set is a recreation equivalent; existing vector geometry is authoritative. Do not replace with Unicode arrows or emoji.

# G. Animation and Interaction Specification

Evidence: timings/triggers below are confirmed in configuration or existing motion source, not recorded live playback. Static screenshots establish appearance.

Brand easing:cubic-bezier(.22,.7,.2,1).
Links:cubic-bezier(.44,0,.56,1).
Rolling digits:cubic-bezier(.16,1,.3,1).

## G1. Entrance and hover
- Common block entrance:in-view threshold.15, once; opacity0→1, y28→0px, duration1s, brand easing. Selective delays0/.08/.1/.16/.2/.24/.3/.5s.
- Hero:heading/group immediate, eyebrow.1s, lower copy/action.5s; same1s duration.
- Home nav:Hero Transparent/From the Field Solid, scroll threshold.5, replaytrue.
- Phone drawer:Menu/X, closed/open height/layout, spring.4s, bounce0.
- Button:hover colors/disc/45°turn, spring.4s, bounce.1.
- Service Card:hover image1.06, arrow45°, scrim change, .8s brand.
- Insight Card:hover Featured1.06/Compact1.08, .6s brand.
- Letter jump:mouseenter on closest link/button; each letter0→−5px→0, 380ms ease-out, 24ms stagger. Accessible label is retained while visual letter spans are hidden from assistive duplication.

## G2. Scroll and image treatments
- Reversible statement reveal:word opacity.18→1 with .25s linear smoothing.
- Forward-only word-fill helper:opacity.16→1, .5s linear smoothing, retains maximum progress and does not rewind. This is distinct from the reversible statement treatment.
- Shutter:8 vertical overlay strips, scaleY1→0 from top; 1.1s brand easing; delay150ms+70ms per strip; once. Strips match immediate background.
- Assigned image parallax:scale1.12, vertical travel factor up to28px, 1.4s brand-eased smoothing, clipped by image frame. No section pinning.
- Rolling digits:entry threshold.6, once; masked doubled0–9 reels, 2.2s,120ms per-digit stagger; suffixes static.
- Count-up:once,1.6s quartic ease-out, preserves sign, decimals, unit.
- Bar rise:parent entry, bottom origin,1.1s; delay300ms+80ms per sibling.
- Bar sweep:once,1.8s,delay.4s,left-to-right clip.
- Crop ring:once,1.9s cubic-out,delay.35s,target read from displayed value.
- Resource-ring conic sweep:once,1.8s cubic-out,delay.3s,to saved target angle.

## G3. Process and journey progress
Desktop normalized scroll begins near70%viewport height, using a span approximately45%viewport height+35%block height. Line scales horizontally. Step activates after its index fraction+.04.

Text opacity.3→1 over.8s brand. Dot White→Forest and scale1.15 over.5s. Image bottom clip→visible over1.3s, retaining24px corners. Sequence can rewind with scroll.

Tablet/stacked modes use1px track,.35s progress-bar/dot smoothing,and sequential steps. A later step becomes ready after the prior step completes. Actual vertical position differences inform orientation. No sticky/pinned section.

## G4. Discrete interaction states
- Signal Explorer:five explicit selected states; image/metric/caption switch; .7s brand component transition. No autoplay found.
- Testimonials:three selected slides, previous/next/indicators, transition0s. No timer/autoplay found. Do not add a speculative crossfade.
- FAQ:Open/Closed, answer visibility, plus/minus, spring.4s/bounce0; single-open coordination closes another item.
- Form:normal/pending/success/error appearances configured; actual delivery not tested.
- Background film:muted, autoplay, loop, cover, no visible controls.

## G5. Runtime details and limits
Common one-time helpers use threshold.1 and bottom root margin−6%, then disconnect. Passive shared scroll updates are requestAnimationFrame-batched and respond to resize. Helpers skip static canvas rendering, so screenshots cannot establish every runtime effect’s frame state.

Helpers check reduced-motion preference and use static outcomes. Every native entrance’s reduced-motion handling was not independently tested.

No evidence establishes cursor followers, arbitrary dragging, infinite tickers, particle effects, sticky process sections, or generic page transitions.

Untested:rapid FAQ clicking,touch-hover persistence,keyboard menu sequence,focus restoration,native select differences,validation messages,network success/error,video buffering. The open-menu image is a state reference,not a recorded interaction.


# H. Responsive Design Specification

Desktop ≥1200px, captured at1200px, general side gutter56px. Tablet768–1199.98px, captured at768px, gutter32px. Phone<768px, captured at390px, gutter20px. No320px or ultrawide capture was made. Wider behavior follows saved constraints, not additional screenshots.

| Area | Desktop | Tablet | Phone |
| --- | --- | --- | --- |
| Navigation | Horizontal links; Home transparent | Horizontal links retained | Solid capsule, Contact + menu, expanding drawer |
| Hero lower row | Description/action across | Across | Stacked |
| Evidence cards | 3 columns, first wider | 3 equal | 1 column |
| Home About | 2 columns | 2 columns | Stacked, badges overlap |
| Dashboard | Map/metrics + 3 lower panels | Broad arrangement retained | Major pieces stacked |
| Service cards | 2 columns | 2 columns | 1 column |
| Signals | Horizontal, 760px source height, gap96 | Horizontal, 640px source height, gap32 | Vertical auto, gap32 |
| Process | 4 columns | 2 columns | 1 column |
| Impact | Value left, label lower-right | Same | Label below value |
| Approach | Text beside diagram | Stacked | Stacked, scaled diagram |
| Testimonials | Photo beside quote | Same | Photo above quote |
| Home Insights | Featured left, compact right | Featured above 2 cards | Stacked |
| About collage | 3 mixed-height images | 3 retained | 3 retained |
| Story statistics | 4 columns | 4 columns | 2 columns |
| Mission/Vision | Photo left, cards stacked right | Photo above 2 side-by-side cards | All stacked |
| Values/Journey/Team | 4 columns | 2 columns | 1 column |
| Directory | Large thumbnail row | Small thumbnail row | Full-width photo, separate arrow hidden |
| Insights grid | 3 columns | 2 columns | 1 column |
| Contact main | Information beside form | Stacked | Stacked |
| Form field pairs | 2 columns | 2 columns | 1 column |
| Interest choices | Wrap | Wrap | Vertical list |
| Capabilities | 2 columns | 1 column | 1 column |
| Results | 3 columns | 2 columns, final wraps | 1 column |
| Prose | 760px max, left aligned | Fits container | Available width |
| Footer top | Brand left + 3 columns | Brand above 3 columns | Navigate/Services paired; Follow below |
| Footer bottom | Across | Across | Stack and wrap |

Display reduces 128→88→54px; body reduces modestly. Wide imagery often has explicit shorter heights rather than a universal ratio. Dedicated responsive appearances coexist with inherited overrides. Radius40→28 only where configured; many cards retain their own40px or24px scale. Fixed navigation remains fixed. Content grows naturally except assigned hero/media/CTA/testimonial dimensions.

# I. Spacing and Layout System

## I1. Widths and alignment
Main content maximum1328px, centered inside section gutters.
Calculated available content:
- 1200−2×56=1088px.
- 768−2×32=704px.
- 390−2×20=350px.
- 1440−2×56=1328px, reaching the cap.
These are calculations, not extra screenshots.

Navigation cap1384px; CTA content1240px; article/legal prose760px; Signal Explorer source1448px. These serve different roles.

Typical structure: full-width section surface → centered bounded container → heading group → content. Cards fill local grids. Master card widths are not runtime minimums. Paragraphs share heading/container edges. Editorial prose remains left aligned inside the larger wrapper;404 is centered.

## I2. Rhythm and exceptions
Typical section vertical padding120/80/48px. Inner-hero top200/144/112px, bottom112/80/64px. Heading-to-content72/56/48px, label-to-heading28px, heading-to-copy32px. Common card gaps20–24px.
Dark inset gutter28/16/12px, inner vertical112/72/56px, horizontal56/32/20px.
Exact exceptions: Home evidence reduced top; Home About Phone60px vertical; article/policy editorial spacing; Home testimonial856px Desktop/Tablet. Appendix1 records all section values.

## I3. Radius/stroke scale
- 999px/100%: pills, circles, dots.
- 48px: Home cap shoulders.
- 40px: major cards, photos, film, testimonial.
- 32px: nested Field Card image.
- 28px: small-screen panel/form/nav/film where configured.
- 24px: interior cards, badges, compact photos.
- 18px: Tablet directory thumbnail.
- 14px: inputs.
- 5px: checkboxes.
- 1px: predominant rules/strokes.
- 5px Cream outline: diagram photos.
- 11px: process-dot source.

Intentional overlaps: About badges, diagram captions, map pins, film/scrim layers. Rounded frames clip image motion. No generic negative-margin collage, pinned section, or floating-static-card system was observed.

# J. Developer Implementation Guide

This is a recreation mapping, not a redesign.

## J1. React hierarchy
```text
SiteShell
  FixedNavigation
    AcreLogo / DesktopLinks / ContactButton
    MenuToggle + ExpandingPhoneDrawer
  RouteContent
    Home: FilmHero, FieldEvidence, AboutPreview, Dashboard,
      ServicesGrid, Signals, Process, Impact, ConnectedField,
      Testimonials, InsightsPreview, FilmCTA
    About: Hero/Trio, Story/Stats, MissionVision, Values, Journey, Team, CTA
    Services: Hero, Directory, Process, Reasons, FAQ, CTA
    Insights: EditorialHero/ArticleGrid, CTA
    Contact: Information/Form, ImageBand, FAQ
    ServiceDetail: Hero, Deliverables/EditorialSections, MoreServices, CTA
    ArticleDetail: Header, Body, CTA
    LegalDetail: Header, Body
    NotFound: ErrorMessage
  SiteFooter
```

Dashboard subparts: FieldMap/Pins/Chips; CropRing/Metrics; ActivityLog/MoistureBars/Forecast. Render one visible navigation/footer. Home scroll mode is a shell state. Shared section primitives preserve local spacing and surface differences.

## J2. CSS tokens
Portable recreation names, not original internal identifiers.
```css
:root {
  --acre-forest: #173f2a;
  --acre-green: #426930;
  --acre-light-green: #dde9d4;
  --acre-hover-green: #1f5237;
  --acre-warm: #e9c46a;
  --acre-cream: #f5f3ea;
  --acre-white: #fff;
  --acre-dark: #10251b;
  --acre-text-secondary: rgba(16,37,27,.66);
  --acre-text-muted: rgba(16,37,27,.4);
  --acre-text-on-dark-secondary: rgba(255,255,255,.7);
  --acre-border: rgba(16,37,27,.14);
  --acre-border-on-dark: rgba(255,255,255,.16);
  --acre-panel: rgba(255,255,255,.05);
  --acre-panel-solid: #234935;
  --acre-scrim: rgba(16,37,27,.6);
  --acre-live: #8fd16a;
  --acre-data-bar: rgba(221,233,212,.22);
  --acre-data-bar-strong: rgba(221,233,212,.28);
  --acre-soft-bar: rgba(95,143,69,.25);
  --acre-energy: #5f8f45;
  --acre-content: 1328px;
  --acre-navigation: 1384px;
  --acre-prose: 760px;
  --acre-ease: cubic-bezier(.22,.7,.2,1);
}
```

## J3. Tailwind/layout mapping
Use768px Tablet and1200px Desktop, not the default1024px desktop threshold. Preserve exact56px gutters rather than rounding.
Section padding:48px20px base;80px32px at768;120px56px at1200.
Container:width100%, max-width1328px, margin-inline:auto.
Inner hero:112px20px64px base;144px32px80px at768;200px56px112px at1200.
Prose:width100%, max760px. Inset:12/16/28px.
These are primitives only; Appendix1 overrides them. Use grid for repeated content, flex/stack for compact UI and ruled rows. Bound inner content, not full-width backgrounds.

## J4. Typography
Load Inter regular/medium/semibold support. Reusable classes preserve each scale’s exact breakpoint size, tracking, line height, weight, and character forms. Avoid global bold-heading or centered-prose resets. Keep article styles separate. Same copy + width + font metrics produces comparable wrapping.

## J5. Animation mapping
Motion for React/Framer Motion can reproduce entrance, hover, layout, and finite states. IntersectionObserver for once-only entry; scroll values/requestAnimationFrame for reversible progress/parallax. CSS conic gradients and simple DOM/SVG bars reproduce static marketing data without a chart/map SDK.
```tsx
<motion.div
  initial={{ opacity: 0, y: 28 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.15 }}
  transition={{ duration: 1, ease: [0.22, 0.7, 0.2, 1], delay: savedDelay }}
>
  {children}
</motion.div>
```

This is a recreation sketch, not original code. Separate one-time reveals from continuous scroll. Do not replay shutter/count/ring every re-entry. Preserve instantaneous testimonials and no autoplay.

## J6. State contracts
- Navigation: larger Home transparent/solid; Phone closed/open; current-route colors.
- Signals: one selected among five; responsive arrangement is separate.
- Testimonials: selected slide among three; previous/next/indicators; no observed timer.
- FAQ: open item or none; opening another closes the prior item.
- Form: values, checked interests, required/email semantics, pending/success/error; server contract unverified.
- Hover: existing interactive elements only.
- Reduced motion: readable static final states where existing helpers provide them.

## J7. Content model
Services: title,slug,number,summary,tags,card/hero images,two chips,overview headline/two paragraphs,four deliverables,four capability title/text pairs,three metric value/label pairs,three step title/text pairs.
Insights: title,slug,category,excerpt,date,image,rich content.
Team: name,role,photo.
Testimonials: name,quote,role,company,photo,avatar; separate slider content configuration.
FAQ: question,answer,page group.
Legal: title,summary,last-updated,rich content.
Preserve record-specific facts and semantic rich-text hierarchy.

## J8. Asset/library requirements
Exact shared film:
https://framerusercontent.com/assets/kBes086butLzsa8R4PQkSsVVXLc.mp4
Poster:hero-field-road-poster.jpg,1920×1080. Native muted autoplay loop cover/inline video equivalent.

Existing WebP field photos,PNG process images,JPEG portraits/alternate crops,and matched line vectors provide fidelity. CSV gives filenames,intrinsic sizes,known alt,and usage,including defaults/metadata. Original binaries were not repackaged; no image URLs guessed.

Equivalent stack:React,Tailwind/authored CSS,Motion,matched line icons,native video/form inputs,CSS grids/conic gradients/clipping. CMS or local structured content can supply records. No live farm API,map SDK,or analytics SDK was established as necessary to recreate the visible marketing experience.

## J9. Limitations
No deployment,published-HTML capture,network trace,performance test,accessibility-conformance test,form submission,external-destination test,or video-duration measurement. Fixed full-page pixel heights are not asserted:copy,font metrics,and media affect them. Configuration exceptions are documented without correcting them.


# Appendix 1. Exact section padding and height ledger
Padding is top/right/bottom/left. Auto means content-driven. Height refers to the section, not each image inside it. The fixed navigation is outside normal flow. D/T/P mean Desktop/Tablet/Phone.

## Home
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Hero | 0px 56px 112px 56px | 0px 32px 104px 32px | 0px 20px 96px 20px | 100vh; min 640px, all modes |
| From the Field | 72px 56px 120px 56px | 56px 32px 80px 32px | 40px 20px 56px 20px | Auto / Auto / Auto |
| About | 120px 56px 120px 56px | 80px 32px 80px 32px | 60px 20px 60px 20px | Auto / Auto / Auto |
| Agriculture Intelligence | 28px | 16px | 12px | Auto / Auto / Auto |
| Services | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Signals | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| How It Works | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Impact | 28px | 16px | 12px | Auto / Auto / Auto |
| Our Approach | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Testimonial | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | 856px / 856px / Auto |
| Insights | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| CTA | 0px 28px 28px 28px | 0px 16px 16px 16px | 0px 12px 12px 12px | Auto / Auto / Auto |

## About
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Page Hero | 200px 56px 112px 56px | 144px 32px 80px 32px | 112px 20px 64px 20px | Auto / Auto / Auto |
| Our Story | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Mission and Vision | 28px | 16px | 12px | Auto / Auto / Auto |
| Values | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Journey | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Team | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| CTA | 0px 28px 28px 28px | 0px 16px 16px 16px | 0px 12px 12px 12px | Auto / Auto / Auto |

## Services
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Page Hero | 200px 56px 112px 56px | 144px 32px 80px 32px | 112px 20px 64px 20px | Auto / Auto / Auto |
| Service List | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| How It Works | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| Why Acre | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| FAQ | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| CTA | 0px 28px 28px 28px | 0px 16px 16px 16px | 0px 12px 12px 12px | Auto / Auto / Auto |

## Insights
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Page Hero and article grid | 200px 56px 120px 56px | 144px 32px 80px 32px | 112px 20px 64px 20px | Auto / Auto / Auto |
| CTA | 0px 28px 28px 28px | 0px 16px 16px 16px | 0px 12px 12px 12px | Auto / Auto / Auto |

## Contact
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Contact | 200px 56px 120px 56px | 144px 32px 80px 32px | 112px 20px 64px 20px | Auto / Auto / Auto |
| Image Band | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| FAQ | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |

## 404
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Not Found | 160px 24px 96px 24px | 144px 24px 96px 24px | 160px 24px 96px 24px | Auto; min 100vh, all modes |

## Service detail
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Page Hero | 200px 56px 112px 56px | 144px 32px 80px 32px | 112px 20px 64px 20px | Auto / Auto / Auto |
| Details | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| More Services | 120px 56px 120px 56px | 80px 32px 80px 32px | 48px 20px 48px 20px | Auto / Auto / Auto |
| CTA | 0px 28px 28px 28px | 0px 16px 16px 16px | 0px 12px 12px 12px | Auto / Auto / Auto |

## Article detail
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Article Header | 200px 56px 72px 56px | 144px 32px 56px 32px | 112px 20px 40px 20px | Auto / Auto / Auto |
| Article Body | 112px 56px 120px 56px | 80px 32px 80px 32px | 64px 20px 64px 20px | Auto / Auto / Auto |
| CTA | 0px 28px 28px 28px | 0px 16px 16px 16px | 0px 12px 12px 12px | Auto / Auto / Auto |

## Legal detail
| Section | Desktop padding | Tablet padding | Phone padding | Height D/T/P |
| --- | --- | --- | --- | --- |
| Page Hero | 200px 56px 72px 56px | 144px 32px 56px 32px | 112px 20px 40px 20px | Auto / Auto / Auto |
| Policy Body | 96px 56px 120px 56px | 72px 32px 80px 32px | 56px 20px 64px 20px | Auto / Auto / Auto |

# Appendix 2. Component master geometry
Master widths are source-canvas values, not runtime minimum widths. Instances fill cells or override geometry. A transition definition alone does not imply a hover action or continuous motion. Duplicate names can represent separately saved interaction appearances.

## Logo
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Dark | auto × auto | 0px | 10px | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |
| Light | auto × auto | 0px | 10px | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |

## Button
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Dark | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |
| Light | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |
| Dark | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |
| Light | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |

## Section Label
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| On Light | auto × auto | 8px 14px 8px 14px | 8px | 999px | horizontal | Spring 0.4s / bounce 0.2 |
| On Dark | auto × auto | 8px 14px 8px 14px | 8px | 999px | horizontal | Spring 0.4s / bounce 0.2 |

## Chip
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| With Dot | auto × auto | 8px 14px 8px 14px | 8px | 999px | horizontal | Spring 0.4s / bounce 0.2 |
| Plain | auto × auto | 8px 14px 8px 14px | 8px | 999px | horizontal | Spring 0.4s / bounce 0.2 |

## Navbar
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Solid | 1200px × auto | 14px 28px 14px 28px | 0px | No outer radius | vertical | Spring 0.4s / bounce 0 |
| Transparent | 1200px × auto | 14px 28px 14px 28px | 0px | No outer radius | vertical | Spring 0.4s / bounce 0 |
| Phone | 390px × auto | 10px 14px 10px 14px | 0px | No outer radius | vertical | Spring 0.4s / bounce 0 |
| Phone Open | 390px × auto | 10px 14px 10px 14px | 0px | No outer radius | vertical | Spring 0.4s / bounce 0 |

## Footer
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | 1200px × auto | 96px 56px 28px 56px | 96px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |
| Phone | 390px × auto | 64px 20px 24px 20px | 56px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |
| Tablet | 768px × auto | 80px 32px 24px 32px | 72px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## Service Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 560px × 560px | 36px | Not explicit | 40px | vertical | Tween 0.8s; ease 0.22, 0.7, 0.2, 1 |
| Default | 560px × 560px | 36px | Not explicit | 40px | vertical | Tween 0.8s; ease 0.22, 0.7, 0.2, 1 |

## Insight Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Featured | 640px × auto | 0px | 24px | No outer radius | vertical | Tween 0.6s; ease 0.22, 0.7, 0.2, 1 |
| Compact | 520px × auto | 0px | 24px | No outer radius | horizontal | Tween 0.6s; ease 0.22, 0.7, 0.2, 1 |
| Featured Hover | 640px × auto | 0px | 24px | No outer radius | vertical | Tween 0.6s; ease 0.22, 0.7, 0.2, 1 |
| Compact Hover | 520px × auto | 0px | 24px | No outer radius | horizontal | Tween 0.6s; ease 0.22, 0.7, 0.2, 1 |

## Team Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 280px × auto | 0px | 6px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## Value Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 280px × 340px | 28px | Not explicit | 24px | vertical | Tween 0.5s; ease 0.22, 0.7, 0.2, 1 |

## Stat
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| On Light | 260px × auto | 20px 0px 0px 0px | 10px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |
| On Dark | 260px × auto | 20px 0px 0px 0px | 10px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## FAQ Item
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Open | 640px × auto | 0px | 0px | No outer radius | vertical | Spring 0.4s / bounce 0 |
| Closed | 640px × auto | 0px | 0px | No outer radius | vertical | Spring 0.4s / bounce 0 |

## Process Step
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 270px × auto | 32px 0px 0px 0px | 12px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |
| Small | 270px × auto | 24px 0px 0px 0px | 12px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## CTA Banner
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | 1160px × 760px | 72px | 28px | 40px | vertical | Spring 0.4s / bounce 0.2 |
| Phone | 358px × 640px | 28px | 20px | 28px | vertical | Spring 0.4s / bounce 0.2 |

## Submit Button
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |
| Pending | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |
| Success | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |
| Error | auto × auto | 6px 6px 6px 20px | 14px | 999px | horizontal | Spring 0.4s / bounce 0.1 |

## Arrow Link
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| On Light | auto × auto | 0px 0px 8px 0px | 8px | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |
| On Dark | auto × auto | 0px 0px 8px 0px | 8px | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |

## Signal Explorer
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Crop health | 1448px × 760px | 0px | 96px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Soil condition | 1448px × 760px | 0px | 96px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Water usage | 1448px × 760px | 0px | 96px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Weather | 1448px × 760px | 0px | 96px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Field activity | 1448px × 760px | 0px | 96px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Stacked / Crop health | 390px × auto | 0px | 32px | No outer radius | vertical | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Stacked / Soil condition | 390px × auto | 0px | 32px | No outer radius | vertical | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Stacked / Water usage | 390px × auto | 0px | 32px | No outer radius | vertical | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Stacked / Weather | 390px × auto | 0px | 32px | No outer radius | vertical | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Stacked / Field activity | 390px × auto | 0px | 32px | No outer radius | vertical | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Crop health | 900px × 640px | 0px | 32px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Soil condition | 900px × 640px | 0px | 32px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Water usage | 900px × 640px | 0px | 32px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Weather | 900px × 640px | 0px | 32px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Field activity | 900px × 640px | 0px | 32px | No outer radius | horizontal | Tween 0.7s; ease 0.22, 0.7, 0.2, 1 |

## Testimonial Slider
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Slide 1 | 1328px × auto | 8px | 8px | 40px | horizontal | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Slide 2 | 1328px × auto | 8px | 8px | 40px | horizontal | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Slide 3 | 1328px × auto | 8px | 8px | 40px | horizontal | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Slide 1 | 900px × auto | 8px | 8px | 40px | horizontal | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Phone / Slide 1 | 358px × auto | 8px | 8px | 40px | vertical | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Slide 2 | 900px × auto | 8px | 8px | 40px | horizontal | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Tablet / Slide 3 | 900px × auto | 8px | 8px | 40px | horizontal | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Phone / Slide 2 | 358px × auto | 8px | 8px | 40px | vertical | Tween 0s; ease 0.22, 0.7, 0.2, 1 |
| Phone / Slide 3 | 358px × auto | 8px | 8px | 40px | vertical | Tween 0s; ease 0.22, 0.7, 0.2, 1 |

## Statement Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 560px × auto | 32px | 8px | 24px | vertical | Spring 0.4s / bounce 0.2 |

## Reason Item
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 640px × auto | 32px 0px 32px 0px | 32px | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |

## Capability Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 200px × auto | 32px | 10px | 24px | vertical | Spring 0.4s / bounce 0.2 |

## Service Step
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 629px × auto | 28px 0px 28px 0px | 40px | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |
| Stacked | 350px × auto | 28px 0px 28px 0px | 8px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## Service Row
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | 1200px × auto | 36px 0px 36px 0px | 48px | No outer radius | horizontal | Tween 0.5s; ease 0.22, 0.7, 0.2, 1 |
| Tablet | 720px × auto | 36px 0px 36px 0px | 20px | No outer radius | horizontal | Tween 0.5s; ease 0.22, 0.7, 0.2, 1 |
| Phone | 360px × auto | 28px 0px 28px 0px | 16px | No outer radius | vertical | Tween 0.5s; ease 0.22, 0.7, 0.2, 1 |
| Desktop | 1200px × auto | 36px 0px 36px 0px | 48px | No outer radius | horizontal | Tween 0.5s; ease 0.22, 0.7, 0.2, 1 |
| Tablet | 720px × auto | 36px 0px 36px 0px | 20px | No outer radius | horizontal | Tween 0.5s; ease 0.22, 0.7, 0.2, 1 |

## Field Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 468px × auto | 8px | 0px | 40px | vertical | Spring 0.4s / bounce 0.2 |
| Tablet | 468px × auto | 8px | 0px | 40px | vertical | Spring 0.4s / bounce 0.2 |
| Phone | 468px × auto | 8px | 0px | 40px | vertical | Spring 0.4s / bounce 0.2 |

## Efficiency Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 294px × auto | 32px | Not explicit | 40px | vertical | Spring 0.4s / bounce 0.2 |
| Phone | 294px × auto | 32px | 32px | 40px | vertical | Spring 0.4s / bounce 0.2 |

## Performance Card
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 310px × auto | 32px | Not explicit | 40px | vertical | Spring 0.4s / bounce 0.2 |
| Phone | 310px × auto | 32px | 48px | 40px | vertical | Spring 0.4s / bounce 0.2 |

## Metric Row
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 1032px × auto | 20px 0px 20px 0px | Not explicit | No outer radius | horizontal | Spring 0.4s / bounce 0.2 |
| Phone | 1032px × auto | 20px 0px 20px 0px | 8px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## Forecast Day
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 32px × auto | 0px | 8px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |
| Rain | 32px × auto | 0px | 8px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## Journey Step
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 200px × auto | 32px 0px 0px 0px | 12px | No outer radius | vertical | Spring 0.4s / bounce 0.2 |

## Stat Badge
| Appearance | Master dimensions | Padding | Gap | Radius | Direction | Transition |
| --- | --- | --- | --- | --- | --- | --- |
| Light | 160px × auto | 20px 24px 20px 24px | 6px | 24px | vertical | Spring 0.4s / bounce 0.2 |
| Dark | 160px × auto | 20px 24px 20px 24px | 6px | 24px | vertical | Spring 0.4s / bounce 0.2 |
| Phone Light | 158px × auto | 14px 16px 14px 16px | 6px | 24px | vertical | Spring 0.4s / bounce 0.2 |
| Phone Dark | 158px × auto | 14px 16px 14px 16px | 6px | 24px | vertical | Spring 0.4s / bounce 0.2 |

# Appendix 3. Image and media inventory
Intrinsic dimensions below belong to the original image, not the displayed frame. Filenames identify source assets; public image URLs were not guessed. Inventory includes metadata and component defaults, not only currently visible page imagery.

| Source filename | Intrinsic width × height | Known alt text |
| --- | --- | --- |
| 01 Cover — 1200x630.png | 4800 × 2520 | No alt found in inspected reference |
| hero-field-road-poster.jpg | 1920 × 1080 | Aerial view of green crop fields with a country road running through them |
| img-fields.webp | 1672 × 941 | Patchwork of cultivated fields seen from the air; Aerial view of cultivated fields along a river; Soil & resource management in the field |
| new-about.webp | 2000 × 1334 | Terraced rice fields in a mountain valley under a bright sky |
| new-intelligence.webp | 1920 × 1280 | Vineyard rows and fields below a green hill beside a lake |
| new-signal-crop.webp | 1280 × 854 | Patchwork of green crop fields on rolling hills |
| new-signal-soil.webp | 1280 × 854 | Rows of young crops stretching toward distant hills |
| new-signal-water.webp | 1200 × 800 | Tractor spraying water over rows of green crops |
| new-signal-weather.webp | 1280 × 854 | Green wheat field under a blue sky with white clouds |
| new-signal-activity.webp | 1920 × 1280 | Farmer with a basket checking crops in a green field; Portrait of Lukas Hoffmann checking crops in a green field |
| Connect v1.png | 1086 × 1448 | Connect |
| Observe v1.png | 1080 × 1080 | Observe |
| Analyze v1.png | 1254 × 1254 | Analyze |
| Act v1.png | 1254 × 1254 | Act |
| img-irrigation.webp | 1536 × 1024 | Irrigation channel and sprinklers watering crop rows at sunset; Smart irrigation; Smart irrigation in the field; Irrigating by need, not by calendar |
| img-crop.webp | 1536 × 1024 | Close-up of healthy green crop leaves at sunrise; Crop intelligence; Crop intelligence in the field; Seeing stress before the leaf does |
| signal-soil.webp | 1355 × 1160 | Cross-section of soil and plant roots below a field |
| img-river.webp | 1536 × 1024 | River winding through fields at sunset; Soil & resource management |
| 82451dd578df5ed42655049da3768b41.jpg | 1024 × 1024 | Portrait of Daniel Okafor tending leafy crops; Grower reviewing a field health map on a tablet; Daniel Okafor |
| team-1.webp | 1200 × 1200 | Portrait of Wei Chen holding a basket of fresh greens in a field |
| Water useage.jpg | 1200 × 800 | Tractor mowing a green field in long stripes, seen from above; Tractor and trailer crossing harvested fields behind a row of maize |
| 178d9bd35d762085f2a6e234c9848064.jpg | 501 × 626 | Tractor mowing a green field in long stripes, seen from above |
| a3e93092bd5a38d5a65691444be70845.jpg | 736 × 1308 | Tractor working a green hillside meadow in spring |
| about-mission.webp | 1536 × 1024 | Farm with silos among striped fields beside a river |
| img-precision.webp | 1536 × 1024 | Precision farming; Precision farming in the field; The acre is no longer the smallest unit of farming |
| step-connect.webp | 1024 × 1536 | No alt found in inspected reference |
| 60f1a6a47fd7a76b09700d95e4a2ff24.jpg | 1200 × 1798 | Portrait of A. Mensah |
| 3fa2b7a72fcc067b2171c4be74671195.jpg | 1080 × 1920 | Portrait of L. Brandt |
| 06cac122a6aa1a2ca0b425d37af39f50.jpg | 1200 × 1200 | Portrait of S. Reyes |
| 40523cd41c6036f9114136e0b488e8d0.jpg | 720 × 1080 | Portrait of K. Tanaka |

Photographic style: real agricultural landscapes, natural green/earth tones, blue sky, occasional warm sunset; environmental portraits rather than abstract studio headshots. This is a visual description, not verification of image provenance. Hero/CTA film is cover-cropped under gradients. About uses an arch; dashboard pins sit over a landscape; service photos use bottom-heavy scrims; team portraits use 4:5 cover crops; circular diagram photos retain 5px Cream outlines. Some process/default sources differ from the applied page instance. The cover graphic is metadata, not a public illustration. See CSV usage contexts.

# Appendix 4. Screenshot reference index
30 references: all nine page types at three widths, plus three targeted visual states. Dynamic examples are those identified in Scope.

| Reference | Visual |
| --- | --- |
| Home Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/9710ba4e-940a-4330-a0bf-fc1042b48f73.jpg) |
| Home Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/f8beab4b-9e01-4a0d-a5f2-41e9d38b15ed.jpg) |
| Home Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/80c330c4-8a21-4970-b3ef-28e477550d74.jpg) |
| About Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/0f0a4afe-d0d7-4cda-9345-a6e34060b872.jpg) |
| Services Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/e6802996-6bb9-4bb5-982b-eb8a9fb4a15c.jpg) |
| About Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/3a514042-6d79-4c91-9de1-fbf7788f26b1.jpg) |
| About Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/e1a60b07-2704-43ae-9a22-87bdbe91ae44.jpg) |
| Services Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/815aac06-ddbd-488a-97c2-ba66c3cea331.jpg) |
| Services Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/8155450f-10df-4e51-8fd2-5412cf8bcef0.jpg) |
| Insights Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/e01552f7-2d1b-4b48-a2c9-1175ffcda6da.jpg) |
| Insights Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/a89ffde3-0971-4660-80bf-aafae88db795.jpg) |
| Insights Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/70151067-7644-446c-9c5b-4a94d5ceff38.jpg) |
| Contact Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/8e739e4a-bba3-4df2-bc05-0491f8c6a703.jpg) |
| Contact Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/24bf2320-bc86-4c3f-b393-ddb4851357ae.jpg) |
| Contact Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/6696900d-f8e5-4778-b5d0-9ccb78dd2847.jpg) |
| 404 Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/b5a3c200-34ff-4f05-a735-7db66287831b.jpg) |
| 404 Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/bea676ca-2974-439c-945f-3be9acf4ef36.jpg) |
| 404 Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/70af9865-06fe-4b31-8ac6-c9b3f3630be2.jpg) |
| Service Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/ad0dd294-e3bc-454c-8d6d-d3411a79c54c.jpg) |
| Service Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/35740a36-dce5-4a40-9b8d-0e3a01ec36a5.jpg) |
| Service Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/633ea119-0b89-4417-b502-442d441a417d.jpg) |
| Insight Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/b7133df0-7e7e-4603-83eb-9676a03ddac2.jpg) |
| Insight Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/dde07b86-ceb5-41bd-9f91-555ebd8c596c.jpg) |
| Insight Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/ea9fa7d2-34c2-43ff-9c2b-4f6c3110b722.jpg) |
| Legal Desktop | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/091993c6-d099-49fd-a2b7-9c94c1544495.jpg) |
| Legal Tablet | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/c2177615-eb17-4acb-9d91-ce7f443d227b.jpg) |
| Legal Phone | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/72f30393-912d-43e3-b7f9-ef0cdb990ae1.jpg) |
| Home Hero detail | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/b7316dcd-6136-4ec4-9b02-810fd1c9eb8d.jpg) |
| Intelligence dashboard detail | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/88447ec1-5006-47d7-bb2f-2eb40718e44d.jpg) |
| Mobile navigation open | [Open screenshot](https://framerusercontent.com/screenshots/on-demand/ed5910dc-5b28-48f9-b40a-26c33e3e1939.jpg) |

The dashboard crop can include fixed navigation floating over its captured page position; that header is not a dashboard control. Open phone navigation is a state reference, not a recorded click sequence. Static references do not prove animation playback, hover timing, video behavior, or form delivery.

End of existing-design specification. No redesign, modifications, or improvement recommendations were applied.