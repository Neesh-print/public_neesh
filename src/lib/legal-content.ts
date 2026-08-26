// GENERATED from the v2 design prototype (Neesh Site v2.dc.html) by
// scripts in the design handoff. Legal text is verbatim — edit the source
// documents, not this file, unless counsel signs off on the change.

export interface LegalBlock {
  kind: 'p' | 'list';
  html?: string;
  items?: string[];
}

export interface LegalSection {
  id: string;
  num: string | null;
  heading: string;
  body: LegalBlock[];
}

export interface LegalDocData {
  h1: string;
  sub: string;
  effective: string;
  intro: string[];
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<
  'terms' | 'privacy' | 'publisherAgreement' | 'retailerAgreement',
  LegalDocData
> = {
  "terms": {
    "h1": "Terms of Service",
    "sub": "The terms governing the Neesh marketplace: accounts, orders, fees, payouts, returns, and dispute resolution.",
    "effective": "Effective August 19, 2026",
    "intro": [
      "These Terms of Service (“Terms”) govern your use of neesh.art and the Neesh marketplace (the “Service”), operated by WAU LLC, an Oregon limited liability company (“Neesh,” “we,” “us”). By using the Service, creating an account, or submitting an application, you agree to these Terms. If you use the Service on behalf of a business, you represent that you are authorized to bind that business, and “you” refers to the business.",
      "If you are approved as a publisher, the <a href=\"/publisher-agreement\">Publisher Agreement</a> also applies to you. If you are approved as a retailer, the <a href=\"/retailer-agreement\">Retailer Agreement</a> also applies. If those agreements conflict with these Terms, the role-specific agreement controls."
    ],
    "sections": [
      {
        "id": "terms-what-neesh-is",
        "num": "01",
        "heading": "What Neesh is",
        "body": [
          {
            "kind": "p",
            "html": "Neesh is a wholesale marketplace that connects independent magazine publishers with retailers. Publishers list their titles; retailers order at wholesale; publishers fulfill orders by shipping directly to retailers. Neesh provides the platform, coordinates payments through Stripe, and facilitates shipping and communication. <strong>Neesh is not a party to the sale between publisher and retailer, does not take ownership of inventory, and is not a distributor, consignee, or agent of either party.</strong> Neesh is a business-to-business wholesale platform, not a consumer-directed marketplace: purchases are made by businesses for resale, not for personal, family, or household use."
          }
        ]
      },
      {
        "id": "terms-eligibility-and-accounts",
        "num": "02",
        "heading": "Eligibility and accounts",
        "body": [
          {
            "kind": "p",
            "html": "The Service is for business use only. You must be at least 18 years old and using the Service in connection with a bona fide publishing or retail business. Publisher and retailer accounts require an application and our approval, which we may grant or decline at our discretion. You are responsible for the accuracy of the information in your application and profile, for maintaining the confidentiality of your login credentials, and for all activity under your account. Notify us immediately at <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a> if you suspect unauthorized use."
          }
        ]
      },
      {
        "id": "terms-orders-and-fulfillment",
        "num": "03",
        "heading": "Orders and fulfillment",
        "body": [
          {
            "kind": "p",
            "html": "When a retailer places an order that a publisher accepts, a contract of sale is formed directly between the retailer and the publisher on the terms shown in the listing at the time of the order. Publishers are responsible for the accuracy of their listings, for having the inventory they list, and for shipping accepted orders promptly with tracking. Retailers are responsible for payment and for receiving and inspecting shipments. Neesh may cancel or reverse orders in cases of error, suspected fraud, or violation of these Terms."
          }
        ]
      },
      {
        "id": "terms-fees-payments-and-payouts",
        "num": "04",
        "heading": "Fees, payments, and payouts",
        "body": [
          {
            "kind": "p",
            "html": "Neesh charges publishers a commission of <strong>10% of the order subtotal (excluding shipping and tax)</strong> on completed orders. There are no listing fees for publishers and no subscription fees for retailers. Payments are processed by Stripe; by transacting on Neesh you also agree to Stripe’s applicable terms, including the Stripe Connected Account Agreement for publishers receiving payouts. Publisher payouts are made on a weekly cycle, less our commission and any amounts owed for approved returns or adjustments, and are subject to Stripe’s processing times and any holds reasonably needed for fraud prevention or disputes. Retailers offered net payment terms (as defined in the Retailer Agreement) must pay invoices by their due date; overdue invoices may result in suspension of ordering privileges."
          }
        ]
      },
      {
        "id": "terms-returns",
        "num": "05",
        "heading": "Returns",
        "body": [
          {
            "kind": "p",
            "html": "Retailer return requests are reviewed and approved case by case. Returns are not automatic or guaranteed, except that requests for items that arrive damaged, defective, incorrect, or missing — reported within the inspection window in the Retailer Agreement with reasonable evidence — will be approved. Requests to return unsold copies are honored where the listing offers unsold-copy returns and the request meets that listing’s stated window and conditions; other requests are at the publisher’s and Neesh’s discretion. When a return is approved, the corresponding amount is reconciled against the publisher’s next payout cycle, and the retailer receives the refund or credit stated in the return decision. Nothing in this section limits rights you have under applicable law that cannot be waived. The role-specific agreements describe the process in more detail."
          }
        ]
      },
      {
        "id": "terms-your-content",
        "num": "06",
        "heading": "Your content",
        "body": [
          {
            "kind": "p",
            "html": "You retain ownership of the content you upload — cover images, photographs, descriptions, logos, and other material. You grant Neesh a non-exclusive, worldwide, royalty-free license to host, display, reproduce, and use that content to operate and promote the Service (for example, showing listings to retailers or featuring titles in Neesh marketing). You represent that you have the rights to everything you upload and that it does not infringe anyone else’s rights. We may remove content that we reasonably believe is infringing, unlawful, or violates these Terms. When your account is closed, we will stop displaying your content and delete uploaded files within a reasonable period, except as needed for legal or record-keeping purposes."
          }
        ]
      },
      {
        "id": "terms-acceptable-use",
        "num": "07",
        "heading": "Acceptable use",
        "body": [
          {
            "kind": "p",
            "html": "You agree not to: misrepresent your identity or business; list content you do not have the right to sell; use the Service to send spam or unsolicited messages; circumvent Neesh by soliciting or completing off-platform transactions that originate through the Service in order to avoid fees; interfere with the operation or security of the Service; scrape or harvest data about other users; or use the Service for any unlawful purpose. We may suspend or terminate accounts that violate these Terms."
          }
        ]
      },
      {
        "id": "terms-copyright-complaints-dmca",
        "num": "08",
        "heading": "Copyright complaints (DMCA)",
        "body": [
          {
            "kind": "p",
            "html": "Neesh’s designated agent for copyright notices is: Copyright Agent, WAU LLC, c/o Registered Agents Inc, 2355 State St STE 101, Salem, OR 97301, USA; email <strong><a href=\"mailto:hi@neesh.art\">hi@neesh.art</a></strong>. If you believe content on the Service infringes your copyright, send a notice to the designated agent with the subject “Copyright Notice” including: identification of the copyrighted work; the URL or location of the allegedly infringing material; your name, address, email, and phone number; a statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law; a statement, under penalty of perjury, that the notice is accurate and you are the owner or authorized to act for the owner; and your physical or electronic signature. We will remove or disable access to material identified in a valid notice and, for account holders, will forward the notice to them and accept counter-notifications meeting the requirements of 17 U.S.C. § 512(g). We may terminate accounts of repeat infringers."
          }
        ]
      },
      {
        "id": "terms-messaging",
        "num": "09",
        "heading": "Messaging",
        "body": [
          {
            "kind": "p",
            "html": "The Service includes messaging between publishers and retailers. Use it for business communication related to the marketplace. We may access messages where necessary to provide support, investigate abuse, or comply with law."
          }
        ]
      },
      {
        "id": "terms-termination",
        "num": "10",
        "heading": "Termination",
        "body": [
          {
            "kind": "p",
            "html": "You may close your account at any time by emailing <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a>. We may suspend or terminate your access at any time for violation of these Terms, risk to other users, or discontinuation of the Service, with notice where practicable. Sections that by their nature should survive termination (including payment obligations, content license for completed transactions, disclaimers, limitations of liability, and governing law) survive."
          }
        ]
      },
      {
        "id": "terms-disclaimers",
        "num": "11",
        "heading": "Disclaimers",
        "body": [
          {
            "kind": "p",
            "html": "The Service is provided “as is” and “as available.” To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that listings are accurate, that publishers or retailers will perform, that the Service will be uninterrupted or error-free, or any particular level of sales or business outcome."
          }
        ]
      },
      {
        "id": "terms-limitation-of-liability",
        "num": "12",
        "heading": "Limitation of liability",
        "body": [
          {
            "kind": "p",
            "html": "To the fullest extent permitted by law, WAU LLC and its members, managers, and employees will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, or data, arising out of or related to the Service. Our total liability for any claim arising out of the Service will not exceed the greater of (a) the total commissions we earned from your transactions in the six months before the claim arose, or (b) one hundred US dollars. Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you."
          }
        ]
      },
      {
        "id": "terms-indemnity",
        "num": "13",
        "heading": "Indemnity",
        "body": [
          {
            "kind": "p",
            "html": "You will indemnify and hold harmless WAU LLC from claims, damages, and expenses (including reasonable attorneys’ fees) arising from your content, your transactions with other users, or your breach of these Terms."
          }
        ]
      },
      {
        "id": "terms-governing-law-and-disputes",
        "num": "14",
        "heading": "Governing law and disputes",
        "body": [
          {
            "kind": "p",
            "html": "These Terms are governed by the laws of the State of Oregon, without regard to conflict-of-laws rules. Any dispute arising out of these Terms or the Service will be resolved in the state or federal courts located in Multnomah County, Oregon, and you consent to personal jurisdiction and venue there. Before filing any claim, you agree to try in good faith to resolve the dispute by contacting us at <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a>."
          }
        ]
      },
      {
        "id": "terms-general-provisions",
        "num": "15",
        "heading": "General provisions",
        "body": [
          {
            "kind": "p",
            "html": "<strong>Business days.</strong> “Business days” means Monday through Friday, excluding United States federal holidays, wherever used in these Terms, the Publisher Agreement, or the Retailer Agreement."
          },
          {
            "kind": "p",
            "html": "<strong>Force majeure.</strong> Neither party is liable for delay or failure to perform (other than payment obligations already due) caused by events beyond its reasonable control, including natural disasters, epidemics, war, civil unrest, labor disputes, carrier or postal disruptions, internet or hosting outages, payment-processor outages, or acts of government. The affected party must notify the other and resume performance as soon as reasonably possible."
          },
          {
            "kind": "p",
            "html": "<strong>Assignment.</strong> You may not assign or transfer your account or your rights and obligations under these Terms without our prior written consent, except to a successor in a merger, acquisition, or sale of substantially all of your business assets, with notice to us. We may assign these Terms to an affiliate or to a successor of our business. Any attempted assignment in violation of this section is void."
          },
          {
            "kind": "p",
            "html": "<strong>Waiver and severability.</strong> A failure to enforce any provision is not a waiver of it, and a waiver on one occasion is not a waiver on any other. If any provision is held unenforceable, it will be modified to the minimum extent necessary and the rest of these Terms remain in effect."
          },
          {
            "kind": "p",
            "html": "<strong>Entire agreement.</strong> These Terms, the Privacy Policy, and the applicable role-specific agreement are the entire agreement between you and Neesh regarding the Service."
          }
        ]
      },
      {
        "id": "terms-changes-to-these-terms",
        "num": "16",
        "heading": "Changes to these Terms",
        "body": [
          {
            "kind": "p",
            "html": "We may update these Terms from time to time. If we make material changes, we will notify account holders by email or a notice on the site at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes acceptance. The current version will always be posted at neesh.art."
          }
        ]
      },
      {
        "id": "terms-contact",
        "num": "17",
        "heading": "Contact",
        "body": [
          {
            "kind": "p",
            "html": "WAU LLC (operating Neesh), Portland, Oregon, USA. <strong><a href=\"mailto:hi@neesh.art\">hi@neesh.art</a></strong>"
          }
        ]
      }
    ]
  },
  "privacy": {
    "h1": "Privacy Policy",
    "sub": "What we collect, how we use it, who we share it with, and the rights you have.",
    "effective": "Effective August 19, 2026",
    "intro": [
      "Neesh (“Neesh,” “we,” “us”) is operated by WAU LLC, an Oregon limited liability company. Neesh is a wholesale marketplace that connects independent magazine publishers with retailers. This policy explains what personal information we collect, how we use it, who we share it with, and the choices you have. It applies to neesh.art and all Neesh services, including publisher and retailer accounts, applications, and our email communications.",
      "If you have any questions, or want to exercise any of the rights described below, email us at <strong><a href=\"mailto:hi@neesh.art\">hi@neesh.art</a></strong>."
    ],
    "sections": [
      {
        "id": "privacy-information-we-collect",
        "num": null,
        "heading": "Information we collect",
        "body": [
          {
            "kind": "p",
            "html": "<strong>Information you give us.</strong> When you join our mailing list, we collect your email address. When you apply as a publisher or retailer, we collect the information in your application, such as your name, business name, email, phone number, business address, details about your publication or shop, and images you upload. When you create an account, we collect your login credentials and profile information, including your name, business name, bio, avatar, address, and website. When you buy or sell through Neesh, we collect order details, shipping addresses, messages you exchange with other users through our messaging feature, and records of payouts, invoices, and returns."
          },
          {
            "kind": "p",
            "html": "<strong>Payment information.</strong> Payments and payouts are processed by Stripe. Your card details and bank account details go directly to Stripe and are never stored on our servers. We store references to your Stripe account (such as customer and account identifiers) and transaction records. Stripe’s handling of your information is described in the <a href=\"https://stripe.com/privacy\">Stripe Privacy Policy</a>."
          },
          {
            "kind": "p",
            "html": "<strong>Information collected automatically.</strong> Like most websites, we and our service providers collect standard technical data when you use the site: IP address, browser type, device information, and pages visited. Emails we send may contain open and click tracking so we can tell whether our messages are useful; unsubscribing from marketing email ends that tracking for marketing messages. Our website uses only cookies and similar technologies that are necessary for login sessions and site functionality — we do not use advertising or cross-site tracking cookies, which is why you do not see a cookie consent banner. If we ever add non-essential cookies, we will update this policy and add appropriate consent controls first."
          },
          {
            "kind": "p",
            "html": "<strong>Sensitive personal information.</strong> We do not ask for or knowingly collect sensitive personal information as defined by applicable privacy laws (such as government ID numbers, precise geolocation, health information, or biometric data). Identity documents that Stripe may request for payout verification go directly to Stripe and are never held by us."
          }
        ]
      },
      {
        "id": "privacy-how-we-use-information",
        "num": null,
        "heading": "How we use information",
        "body": [
          {
            "kind": "p",
            "html": "We use your information to operate the marketplace: reviewing applications, creating accounts, displaying listings, facilitating orders between publishers and retailers, coordinating shipping, processing payments and payouts, handling returns, and providing support. We use contact information to send transactional emails (order notifications, application decisions, account messages) and, where you have signed up or otherwise opted in, marketing emails such as newsletters and product updates. You can unsubscribe from marketing email at any time using the link in any message; transactional emails about your account or orders will still be sent. We also use information to keep the platform secure, prevent fraud and abuse, comply with legal obligations, and improve our services. We practice data minimization: we collect only the categories of information reasonably necessary for the purposes described in this policy, and we do not use your information for unrelated purposes without telling you first."
          },
          {
            "kind": "p",
            "html": "We do not sell your personal information, we do not “sell” or “share” it as those terms are defined in US state privacy laws, and we do not disclose it to third parties for their own advertising or use it for targeted advertising or profiling with significant effects."
          }
        ]
      },
      {
        "id": "privacy-who-we-share-information-with",
        "num": null,
        "heading": "Who we share information with",
        "body": [
          {
            "kind": "p",
            "html": "We share information with service providers who process it on our behalf, only as needed to run Neesh:"
          },
          {
            "kind": "list",
            "items": [
              "<strong>Supabase</strong> — database, authentication, and file storage",
              "<strong>Stripe</strong> — payment processing, identity verification for payouts, and payouts to publishers",
              "<strong>Resend</strong> — transactional and marketing email delivery, including open and click tracking",
              "<strong>HubSpot</strong> — customer relationship management and email signups",
              "<strong>Google Cloud Storage</strong> — hosting of some site images and uploaded files",
              "<strong>Vercel</strong> — website hosting"
            ]
          },
          {
            "kind": "p",
            "html": "We also share information between marketplace participants as needed to complete transactions: for example, when a retailer places an order, the publisher receives the shop name and shipping address needed to fulfill it. We may disclose information if required by law, to protect our rights or the safety of others, or as part of a business transaction such as a merger or acquisition, in which case this policy will continue to apply to previously collected information."
          }
        ]
      },
      {
        "id": "privacy-international-transfers",
        "num": null,
        "heading": "International transfers",
        "body": [
          {
            "kind": "p",
            "html": "Neesh is operated from the United States and our service providers store data in the United States. If you are in the United Kingdom, the European Economic Area, Canada, or elsewhere outside the US, your information will be transferred to and processed in the US. Where required, we rely on appropriate safeguards such as standard contractual clauses implemented by our service providers. You can request more information about the safeguards that apply to your data, or a copy of the relevant clauses where we are able to provide one, by emailing <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a>."
          }
        ]
      },
      {
        "id": "privacy-how-long-we-keep-information",
        "num": null,
        "heading": "How long we keep information",
        "body": [
          {
            "kind": "p",
            "html": "We keep personal information for as long as your account is active or as needed to provide services, and afterward as needed for legitimate business purposes such as tax, accounting, and legal compliance. Application data for applications that are not approved is retained so we can handle re-applications and questions, and deleted on request. If you close your account, we delete or de-identify your personal information within 90 days, except records we are required to keep — for example, transaction and payout records are retained for up to 7 years for tax and accounting purposes, and records of legal claims or disputes are kept until resolved."
          }
        ]
      },
      {
        "id": "privacy-your-rights",
        "num": null,
        "heading": "Your rights",
        "body": [
          {
            "kind": "p",
            "html": "Depending on where you live, you may have rights under laws such as the UK and EU GDPR, Canada’s PIPEDA, or the Oregon Consumer Privacy Act. These include the right to access the personal information we hold about you, correct it, delete it, receive a copy in a portable format, object to or restrict certain processing, and withdraw consent where processing is based on consent. Where we rely on legal bases under the GDPR, we process your information to perform our contract with you (operating your account and transactions), for our legitimate interests (running and securing the marketplace), with your consent (marketing email), and to comply with legal obligations."
          },
          {
            "kind": "p",
            "html": "To exercise any of these rights, email <strong><a href=\"mailto:hi@neesh.art\">hi@neesh.art</a></strong> from the address associated with your account (or with enough information for us to verify you). You may also use an authorized agent to submit a request on your behalf; we will ask the agent for proof of your written authorization and may still verify your identity directly. We will respond within 45 days, or sooner where applicable law requires it, and will tell you if we need an extension."
          },
          {
            "kind": "p",
            "html": "<strong>Appeals.</strong> If we decline a request, we will explain why, and you can appeal by replying to our decision or emailing <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a> with “Privacy Appeal” in the subject line. A different reviewer will decide the appeal within 45 days and reply in writing. If you are unsatisfied after an appeal you may contact your regulator: in Oregon or other US states, your state Attorney General; in the UK or EEA, your data protection authority; in Canada, the Office of the Privacy Commissioner."
          }
        ]
      },
      {
        "id": "privacy-security",
        "num": null,
        "heading": "Security",
        "body": [
          {
            "kind": "p",
            "html": "We use industry-standard measures to protect your information, including encryption in transit, access controls, and row-level security on our database. No system is perfectly secure, so we cannot guarantee absolute security, but we work to protect your information and will notify you and the relevant authorities of a data breach where the law requires it — for Oregon residents, within 45 days of discovery as Oregon law requires, and otherwise without undue delay."
          }
        ]
      },
      {
        "id": "privacy-children",
        "num": null,
        "heading": "Children",
        "body": [
          {
            "kind": "p",
            "html": "Neesh is a business-to-business service for account holders 18 and over, and it is not directed to children under 13. We do not knowingly collect personal information from children under 13 as defined by COPPA. If you believe a child has provided us personal information, contact us at <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a> and we will delete it promptly."
          }
        ]
      },
      {
        "id": "privacy-changes-to-this-policy",
        "num": null,
        "heading": "Changes to this policy",
        "body": [
          {
            "kind": "p",
            "html": "We may update this policy from time to time. If we make material changes, we will notify account holders by email or a notice on the site before the changes take effect. The effective date at the top shows when this policy was last revised."
          }
        ]
      },
      {
        "id": "privacy-contact",
        "num": null,
        "heading": "Contact",
        "body": [
          {
            "kind": "p",
            "html": "WAU LLC (operating Neesh). Mailing address: WAU LLC, c/o Registered Agents Inc, 2355 State St STE 101, Salem, OR 97301, USA. <strong><a href=\"mailto:hi@neesh.art\">hi@neesh.art</a></strong>"
          }
        ]
      }
    ]
  },
  "publisherAgreement": {
    "h1": "Publisher Agreement",
    "sub": "The terms that apply once your publisher application is approved: listings, fulfillment windows, commission, payouts, and returns.",
    "effective": "Effective August 19, 2026",
    "intro": [
      "This Publisher Agreement is between WAU LLC, an Oregon limited liability company operating Neesh (“Neesh”), and the publisher accepting it (“Publisher,” “you”). It applies when your publisher application is approved and you accept it during onboarding, and it supplements the <a href=\"/terms\">Neesh Terms of Service</a>. Capitalized terms not defined here have the meanings in the Terms."
    ],
    "sections": [
      {
        "id": "pubag-marketplace-relationship",
        "num": "01",
        "heading": "Marketplace relationship",
        "body": [
          {
            "kind": "p",
            "html": "Neesh grants you non-exclusive access to list your publications for wholesale purchase by approved retailers. You remain the seller of record in every transaction. Neesh does not purchase, hold, or take title to your inventory at any time, and nothing in this Agreement creates an employment, agency, distribution, or consignment relationship."
          }
        ]
      },
      {
        "id": "pubag-listings",
        "num": "02",
        "heading": "Listings",
        "body": [
          {
            "kind": "p",
            "html": "You will keep your listings accurate and current, including titles, issues, cover imagery, wholesale prices, suggested retail prices, available quantities, and any per-title terms (such as whether unsold-copy returns are offered). You represent and warrant that you hold all rights necessary to sell and license the content you list, that your listings and publications do not infringe any third party’s intellectual property or other rights, and that your publications comply with applicable law."
          }
        ]
      },
      {
        "id": "pubag-orders-and-fulfillment",
        "num": "03",
        "heading": "Orders and fulfillment",
        "body": [
          {
            "kind": "p",
            "html": "When you accept an order, you agree to hand it to the carrier within <strong>5 business days</strong> (Monday–Friday, excluding US federal holidays; or the fulfillment window shown on your listing, if different), using tracked shipping, packaged appropriately for print products. Carrier delays after timely handoff do not breach this window, though you must cooperate in resolving them. You are responsible for the condition of goods until delivery to the retailer’s designated address. If you cannot fulfill an accepted order, notify Neesh and the retailer promptly; repeated failures to fulfill may result in suspension."
          }
        ]
      },
      {
        "id": "pubag-commission-and-payouts",
        "num": "04",
        "heading": "Commission and payouts",
        "body": [
          {
            "kind": "p",
            "html": "Neesh’s commission is <strong>10% of the order subtotal (excluding shipping and tax)</strong> on completed orders. Payouts of amounts owed to you, less commission and adjustments under Section 5, are made <strong>weekly</strong> to your connected Stripe account. You must complete Stripe Connect onboarding, including any identity and bank verification Stripe requires, and you must agree to the <a href=\"https://stripe.com/connect-account/legal\">Stripe Connected Account Agreement</a> (which incorporates the Stripe Services Agreement) as a condition of receiving payouts. Payout timing is subject to Stripe’s processing times. Neesh may delay or withhold a payout only where reasonably necessary to address suspected fraud, a payment dispute, or a chargeback; if we do, we will notify you within 2 business days with the reason and the amount affected, release any undisputed portion, and resolve the hold within 30 days unless a longer period is required by the underlying card-network dispute process or law."
          }
        ]
      },
      {
        "id": "pubag-returns-and-adjustments",
        "num": "05",
        "heading": "Returns and adjustments",
        "body": [
          {
            "kind": "p",
            "html": "Retailer return requests are reviewed case by case, except that damage, defect, wrong-item, and missing-item claims reported within the Retailer Agreement’s inspection window with reasonable evidence will be approved, and unsold-copy returns will be honored where your listing offers them on the listing’s stated conditions. Where a return, refund, or chargeback involving your titles results in a deduction, Neesh will itemize it in your payout records with the order, the reason, and supporting documentation on request. If you believe a deduction is wrong, notify us within 14 days of the payout statement and we will review and respond within 14 days; amounts we agree were deducted in error are added to your next payout. If your payout balance is insufficient to cover an approved return, refund, or chargeback, you authorize Neesh to deduct the amount from subsequent payouts or invoice you for it, with invoices due 30 days after issue."
          }
        ]
      },
      {
        "id": "pubag-taxes",
        "num": "06",
        "heading": "Taxes",
        "body": [
          {
            "kind": "p",
            "html": "You are responsible for your own taxes, including income tax on your sales and any obligation to collect and remit sales or similar taxes where you have such an obligation. You acknowledge that shipping orders to retailers in other states may create sales tax obligations in those destination states depending on applicable nexus thresholds, and that determining and meeting those obligations is your responsibility. Neesh will provide transaction records to support your reporting."
          }
        ]
      },
      {
        "id": "pubag-term-and-termination",
        "num": "07",
        "heading": "Term and termination",
        "body": [
          {
            "kind": "p",
            "html": "This Agreement starts when you accept it and continues until either party ends it. You may terminate at any time by written notice (email to <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a> suffices); Neesh may terminate or suspend as described in the Terms of Service. On termination, you must still fulfill accepted orders or arrange cancellations, and outstanding amounts will be settled on the normal payout cycle. Sections 5, 6, and any accrued payment obligations survive termination."
          }
        ]
      },
      {
        "id": "pubag-general",
        "num": "08",
        "heading": "General",
        "body": [
          {
            "kind": "p",
            "html": "This Agreement is governed by Oregon law, with disputes resolved as set out in the Terms of Service. The general provisions of the Terms of Service — including force majeure, assignment, waiver, severability, and the definition of “business days” — apply to this Agreement. This Agreement plus the Terms of Service and Privacy Policy are the entire agreement between you and Neesh regarding your publisher account."
          },
          {
            "kind": "p",
            "html": "<strong>Accepted by the Publisher electronically during application or onboarding.</strong>"
          }
        ]
      }
    ]
  },
  "retailerAgreement": {
    "h1": "Retailer Agreement",
    "sub": "The terms that apply once your retailer application is approved: purchasing, payment, delivery, inspection, and returns.",
    "effective": "Effective August 19, 2026",
    "intro": [
      "This Retailer Agreement is between WAU LLC, an Oregon limited liability company operating Neesh (“Neesh”), and the retailer accepting it (“Retailer,” “you”). It applies when your retailer application is approved and you accept it during onboarding, and it supplements the <a href=\"/terms\">Neesh Terms of Service</a>. Capitalized terms not defined here have the meanings in the Terms."
    ],
    "sections": [
      {
        "id": "retag-wholesale-purchasing",
        "num": "01",
        "heading": "Wholesale purchasing",
        "body": [
          {
            "kind": "p",
            "html": "Neesh grants you non-exclusive access to browse listings and purchase publications at wholesale directly from publishers, for resale through your own retail business. Purchases are for resale only, not personal consumption or redistribution through other wholesale channels. Each order you place is an offer to buy from the publisher on the listing’s terms; a contract of sale forms between you and the publisher when the order is accepted."
          }
        ]
      },
      {
        "id": "retag-payment",
        "num": "02",
        "heading": "Payment",
        "body": [
          {
            "kind": "p",
            "html": "You will pay for orders at checkout by the payment methods offered, or, if Neesh has extended net payment terms to your account, by the invoice due date. Net terms, where extended, are <strong>Net 30 from the invoice date</strong> unless different terms are stated in writing for your account; net terms are a discretionary credit accommodation that Neesh may adjust or withdraw prospectively with notice. Invoices unpaid after the due date may accrue a late charge of 1.5% per month (or the maximum allowed by law, if lower), and overdue accounts may lose ordering privileges or net terms. You authorize Neesh’s payment processor, Stripe, to charge your saved payment method for amounts you owe, including approved invoice amounts."
          }
        ]
      },
      {
        "id": "retag-delivery-and-inspection",
        "num": "03",
        "heading": "Delivery and inspection",
        "body": [
          {
            "kind": "p",
            "html": "Publishers ship directly to the address on your order with tracking. Orders are destination contracts: “delivery” means receipt of the goods at the address on your order, and risk of loss passes to you at that point — the publisher bears risk while goods are in transit. Inspect shipments on arrival and report damaged, defective, missing, or incorrect items to Neesh within <strong>7 days of delivery</strong>, with photos where applicable. Neesh will review the evidence and reasonably determine whether an issue arose in transit or before shipment, and will resolve it with the publisher accordingly."
          }
        ]
      },
      {
        "id": "retag-returns",
        "num": "04",
        "heading": "Returns",
        "body": [
          {
            "kind": "p",
            "html": "Return requests are reviewed and approved <strong>case by case</strong> — returns are not automatic or guaranteed, with two exceptions. First, claims for items that arrive damaged, defective, incorrect, or missing will be approved when reported within the 7-day inspection window in Section 3 with reasonable evidence (photos of damage, packing slip discrepancies), and you will receive a refund, credit, or replacement at your choice where a replacement is available. Second, where a listing offers unsold-copy returns, requests that meet the listing’s stated window and conditions will be honored. All other requests are discretionary. Approved returns must be shipped back (or disposed of, if instructed) in the condition required by the approval, and refunds or credits are issued after the return is confirmed. Return shipping is at your cost unless the return is due to publisher error or damage in transit. If you have a payment dispute, contact <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a> before initiating a card chargeback — most issues are resolved faster through us, and unexplained chargebacks on delivered orders may result in suspension."
          }
        ]
      },
      {
        "id": "retag-conduct",
        "num": "05",
        "heading": "Conduct",
        "body": [
          {
            "kind": "p",
            "html": "You agree to keep your shop and contact information current, to use publisher content (cover images, descriptions) only to market the titles you have purchased, and not to circumvent Neesh by moving transactions that originate on the platform off-platform to avoid fees. Repeated cancellations, chargebacks, or abusive conduct toward publishers may result in suspension."
          }
        ]
      },
      {
        "id": "retag-taxes-and-resale",
        "num": "06",
        "heading": "Taxes and resale",
        "body": [
          {
            "kind": "p",
            "html": "You are responsible for collecting and remitting sales tax on your retail sales and for providing a valid resale certificate where required. Wholesale purchases through Neesh are made for resale; you will not claim exemption you are not entitled to."
          }
        ]
      },
      {
        "id": "retag-term-and-termination",
        "num": "07",
        "heading": "Term and termination",
        "body": [
          {
            "kind": "p",
            "html": "This Agreement starts when you accept it and continues until either party ends it. You may terminate at any time by written notice (email to <a href=\"mailto:hi@neesh.art\">hi@neesh.art</a> suffices); Neesh may terminate or suspend as described in the Terms of Service. Termination does not relieve you of payment obligations for orders already placed. Sections 2, 4, 6, and any accrued obligations survive termination."
          }
        ]
      },
      {
        "id": "retag-general",
        "num": "08",
        "heading": "General",
        "body": [
          {
            "kind": "p",
            "html": "This Agreement is governed by Oregon law, with disputes resolved as set out in the Terms of Service. The general provisions of the Terms of Service — including force majeure, assignment, waiver, severability, and the definition of “business days” — apply to this Agreement. This Agreement plus the Terms of Service and Privacy Policy are the entire agreement between you and Neesh regarding your retailer account."
          },
          {
            "kind": "p",
            "html": "<strong>Accepted by the Retailer electronically during application or onboarding.</strong>"
          }
        ]
      }
    ]
  }
};
