var CONQUESTAI = function (m) {

    m.Config = function (difficulty, behavior) {
        // 0 is sandbox, 1 is very easy, 2 is easy, 3 is medium, 4 is hard and 5 is very hard.
        this.difficulty = difficulty !== undefined ? difficulty : 3;

        // for instance "balanced", "aggressive" or "defensive"
        this.behavior = behavior || "random";

        // debug level: 0=none, 1=sanity checks, 2=debug, 3=detailed debug, -100=serializatio debug
        this.debug = 0;

        this.chat = true;	// false to prevent AI's chats

        // the additional ratio of unresponsiveness for the AI per difficulty level from hard to very easy
        // 1.5 for hard = 50% additional time spent that the AI makes no major decisions for building, recruiting, teching, trading and attacking
        this.difficultyRatio = [1, 1, 1.5, 3, 5];

        // Set the dialog for specific AI hero characters, the AI will use these for the personality system
        // ****************************************************************************************************************************
        // COMMANDS
        // ****************************************************************************************************************************
        // ||text||RGB value|| = color 'text' with the RGB value provided e.g. ||some text||255 0 0|| to make 'some text' the color red
        // ||text||PC|| = give 'text' the player color of the sending player
        // ||RP|||| = the name of the player receiving the message with the corresponding color
        // ||meta + index||RGB value|| = meta data which is provided in certain events, what that data represents is provided in the events list below
        // this data will differ per event and are incremented by index e.g. ||meta1||0 255 0|| or ||meta2||meta3||
        // ****************************************************************************************************************************
        // EVENTS
        // ****************************************************************************************************************************
        // IntroEnemy: message send to enemies after starting a new match
        // IntroAlly: message send to allies after starting a new match
        // HelpRequest: message send to allies after this AI was attacked by another player (meta1 = attacking player name, meta2 = attacking player color)
        this.AIDialogData =
        {
            "hylian":
            {
                "Link, Heir of King Gustaf":
                {
                    "PortraitName": ["Link"],
                    "IntroEnemy":
                        [
                            { "dialog": "The Kingdom shall prevail this day, face me if you dare ||RP||||.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "Well met ||RP||||, I am ||Link, Heir of King Gustaf||PC||, if you need anything, just let me know.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The enemy is tough ||RP||||, I could use your help against ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_angry" },
                        ],
                },
                "Princess Tetralyna Zelda V":
                {
                    "PortraitName": ["Zelda"],
                    "IntroEnemy":
                        [
                            { "dialog": "I have foreseen this battle ||RP||||, and I am afraid it won't end well for you.", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "Greetings ||RP||||, your fealty in this battle will not go unnoticed.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The enemy attacks your Princess ||RP||||, I request your assistance in my defense against ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Lana":
                {
                    "PortraitName": ["Lana"],
                    "IntroEnemy":
                        [
                            { "dialog": "Oh my, who do we have here? Do you honestly think you can stand against the power of my magic ||RP||||?", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "I am sure you won't mind my involvement in this battle ||RP||||, with the power of my magic, our victory is assured.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "My magic is failing me ||RP||||, I could use your help against ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Captain Krin":
                {
                    "PortraitName": ["Krin"],
                    "IntroEnemy":
                        [
                            { "dialog": "Prepare yourself ||RP||||, under my command, any enemy of the Kingdom shall be defeated!", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "||Captain Krin||PC|| reports for duty, let me know when you engage the enemies of the Kingdom ||RP||||, they must be defeated!", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The foe attacks me ||RP||||, I could use your assistance against ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Seres":
                {
                    "PortraitName": ["Seres"],
                    "IntroEnemy":
                        [
                            { "dialog": "I had hoped we could have peacefully resolved our differences, but it seems war between us is the only outcome left.", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "It is good to see you ||RP||||! if you need any help, just say the word.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "I am in deep trouble over here ||RP||||, ||meta1||meta2|| is attacking me!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Rauru, Sage of Light":
                {
                    "PortraitName": ["Rauru"],
                    "IntroEnemy":
                        [
                            { "dialog": "May the Goddesses grant me the strength to crush you ||RP||||.", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "Blessings to you ||RP||||, may we be granted a victory on this day through our combined efforts.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The enemy strikes ||RP||||, help me thwart this invasion from ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                }
            },
            "gerudo":
            {
                "Emperor Ganondorf":
                {
                    "PortraitName": ["Ganondorf"],
                    "IntroEnemy":
                        [
                            { "dialog": "Your skull will be but one of the countless I have crushed beneath my feet ||RP||||.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "Bow before me and swear your servitude ||RP||||, so that together, we may crush our enemies!", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "Your Emperor needs your help ||RP||||, defend me or face the consequences of your failure to do so.", "soundIndex": 1, "portraitSuffix": "_angry" },
                        ],
                },
                "Nabooru, Sage of Spirits":
                {
                    "PortraitName": ["Nabooru"],
                    "IntroEnemy":
                        [
                            { "dialog": "Tread carefully ||RP||||, lest you run against the winds of death that will soon be upon you.", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "The Gerudo rarely work with others, but I sincerely hope you will prove to be a capable addition to our ranks ||RP||||.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "||meta1||meta2|| strikes ||RP||||! Come quickly!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "General Urbosa":
                {
                    "PortraitName": ["Urbosa"],
                    "IntroEnemy":
                        [
                            { "dialog": "Prepare to taste my blade firsthand ||RP||||, that is, if my women do not fell you first!", "soundIndex": 2, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "If our combined forces are to engage the enemy ||RP||||, I sure hope you will at least be able to match half the strength of my own battalions.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The enemy has initiated their offensive ||RP||||, help me beat ||meta1||meta2|| back!", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                },
                "Princess Makeela Riju":
                {
                    "PortraitName": ["Riju"],
                    "IntroEnemy":
                        [
                            { "dialog": "What a sorry excuse you are ||RP||||, your weak presence doesnt even come close to the sandstorms I have endured during my lifetime.", "soundIndex": 2, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "It is good to finally meet eye to eye ||RP||||, I presume you are ready to stop these fools with our combined armies.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "||meta1||meta2|| attacks my base of operations ||RP||||, please come help me repel these invaders.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                },
                "Buliara":
                {
                    "PortraitName": ["Buliara"],
                    "IntroEnemy":
                        [
                            { "dialog": "I will personally make sure that you wont get to see the rising sun ever again ||RP||||, none opposes the Gerudo and lives.", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "||Buliara||PC|| is at your service ||RP||||, for the crown of the Gerudo I shall fight any foe.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The Gerudo falter ||RP||||! ||meta1||meta2|| is attacking!", "soundIndex": 2, "portraitSuffix": "_annoyed" },
                        ],
                },
                "Aveil":
                {
                    "PortraitName": ["Aveil"],
                    "IntroEnemy":
                        [
                            { "dialog": "There is much to plunder in this world ||RP||||, I take it... you are my next target?", "soundIndex": 1, "portraitSuffix": "_annoyed" }
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "The riches are ripe for the taking ||RP||||, I say you join me and we split the treasure after the fighting is over.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "||meta1||meta2|| is looting my valuables ||RP||||! You must help me secure them!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                }
            },
            "zora":
            {
                "Ambassador Zaleen":
                {
                    "PortraitName": ["Zaleen"],
                    "IntroEnemy":
                        [
                            { "dialog": "Do not threaten the Dominion lightly ||RP||||. As an outsider you have zero chance of success.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "My Healers are on standby if you have need of them ||RP||||. May we find ourselves victorious.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The Dominion is under attack ||RP||||! I could use your assistance against ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Telara, Headmaster Historian":
                {
                    "PortraitName": ["Telara"],
                    "IntroEnemy":
                        [
                            { "dialog": "You can't keep your knowledge hidden forever ||RP||||. With me as Headmaster, the Dominion shall put a stop to your tactics.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "Greetings ||RP||||! As Headmaster, I shall grant you the information required to defeat the enemies of the Dominion.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "The enemy has caught me off guard ||RP||||! Help me deal with ||meta1||meta2||!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Jabun, Spawn of Lord Jabu Jabu":
                {
                    "PortraitName": ["Jabun"],
                    "IntroEnemy":
                        [
                            { "dialog": "You are but grains of insignificant sand before the waves of the Dominion ||RP||||.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "Greetings child, are you prepared to cleanse these lands in the Dominion's name?", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "A raging storm has been unleashed upon me ||RP||||! ||meta1||meta2|| grows stronger!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "King Zora De Bon XVI":
                {
                    "PortraitName": ["Debon"],
                    "IntroEnemy":
                        [
                            { "dialog": "In the name of the Dominion, you face her champion and her King ||RP||||!", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "It is good to see you vassal ||RP||||, your submission is most welcome in the Dominion.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "I summon thee ||RP||||! ||meta1||meta2|| has engaged us!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Princess Ruto, Sage of Water":
                {
                    "PortraitName": ["Ruto"],
                    "IntroEnemy":
                        [
                            { "dialog": "An intruder in the Dominion? How exciting! I hope you don't break my heart before I break yours ||RP||||.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "A companion to aid me in battle? Not that I technically need it, but having fun is the most important, wouldn't you agree ||RP||||?", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "How is ||meta1||meta2|| able to attack me so abruptly?! ||RP||||! I could really use some help right about now!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                },
                "Laruto, the Elder Sage":
                {
                    "PortraitName": ["Laruto"],
                    "IntroEnemy":
                        [
                            { "dialog": "I have generated countless waves and witnessed them crushing foes mightier than you could imagine ||RP||||. I can assure you that this occasion will not be different.", "soundIndex": 1, "portraitSuffix": "_annoyed" },
                        ],
                    "IntroAlly":
                        [
                            { "dialog": "You shall receive the aid of a Sage today ||RP||||. Be glad that today I address you friend rather than foe.", "soundIndex": 1, "portraitSuffix": "_happy" },
                        ],
                    "HelpRequest":
                        [
                            { "dialog": "If you wish to prove your worth to a Sage ||RP||||, now would be a good time! ||meta1||meta2|| has invaded!", "soundIndex": 1, "portraitSuffix": "_defeated" },
                        ],
                }
            }
        };

        // The AI file loads this in for the specific faction set. For some of these settings, no faction has to be specified and will simply be ignored
        this.AIData =
        {
            // Every building that is not considered "standard" should be added here for every faction. The number of copies build and at what pop level, has to be set in the structure template.
            "advanced": {
                "hylian": ["structures/hylian/hylian_barracks", "structures/hylian/hylian_barracksB", "structures/hylian/hylian_stables", "structures/hylian/hylian_mercs", "structures/hylian/hylian_blacksmith", "structures/hylian/hylian_temple", "structures/hylian/hylian_siegeworks", "structures/hylian/hylian_fortress", "structures/hylian/hylian_wonder"],
                "gerudo": ["structures/gerudo/gerudo_barracks", "structures/gerudo/gerudo_barracksB", "structures/gerudo/gerudo_blacksmith", "structures/gerudo/gerudo_blacksmithC", "structures/gerudo/gerudo_mercs", "structures/gerudo/gerudo_stables", "structures/gerudo/gerudo_stablesB", "structures/gerudo/gerudo_temple", "structures/gerudo/gerudo_wonder", "structures/gerudo/gerudo_fortress"],
				"goron": ["structures/goron/goron_barracks", "structures/goron/goron_wonder", "structures/goron/goron_storehouse"],
                "zora": ["structures/zora/zora_barracks", "structures/zora/zora_barracksB", "structures/zora/zora_blacksmith", "structures/zora/zora_blacksmithB", "structures/zora/zora_stables", "structures/zora/zora_wonder", "structures/zora/zora_mercs", "structures/zora/zora_farmstead"],
			   "kokiri": ["structures/kokiri/kokiri_grove_market", "structures/kokiri/kokiri_grove_barracks", "structures/kokiri/kokiri_grove_blacksmith", "structures/kokiri/kokiri_wonder"],
			   "gohma": ["structures/gohma/gohma_blacksmithA",],
				"ordona": ["structures/ordona/ordona_apiary", "structures/ordona/ordona_barracks", "structures/ordona/ordona_farmstead", "structures/ordona/ordona_blacksmith", "structures/ordona/ordona_temple", "structures/ordona/ordona_mercs", "structures/ordona/ordona_siegeworks", "structures/ordona/ordona_stables", "structures/ordona/ordona_wonder"],
			   "lanayru": ["structures/lanayru/lanayru_hub_house", "structures/lanayru/lanayru_hub_animal", "structures/lanayru/lanayru_hub_economy", "structures/lanayru/lanayru_hub_barracks"],
				"darknut": ["structures/darknut/darknut_barracks", "structures/darknut/darknut_barracksA", "structures/darknut/darknut_barracksB", "structures/darknut/darknut_apotheon", "structures/darknut/darknut_mercs", "structures/darknut/darknut_blacksmith", "structures/darknut/darknut_blacksmithA"],
				"deku": ["structures/deku/deku_barracks", "structures/deku/deku_barracksB", "structures/deku/deku_stables", "structures/deku/deku_stablesB", "structures/deku/deku_mercs", "structures/deku/deku_blacksmith", "structures/deku_fortress", "structures/deku/deku_wonder"],
				"labrynna": ["structures/labrynna/labrynna_barracks", "structures/labrynna/labrynna_zoo", "structures/labrynna/labrynna_science", "structures/labrynna/labrynna_blacksmith", "structures/labrynna_fortress", "structures/labrynna/labrynna_wonder"],
				"fairy": ["structures/fairy/fairy_barracks", "structures/fairy/fairy_barracksB", "structures/fairy/fairy_barracksC", "structures/fairy/fairy_blacksmith", "structures/fairy/fairy_blacksmithb", "structures/labrynna_misthenge", "structures/fairy/fairy_wonder"],
            },

            // This is for performance increase. Make sure to put in one true for factions that only have upgradeable buildings like the hylians. Put in two trues for factions with upgradeable buildings and units like the gohma
            // this will change when the upgrading of entities will be implemented
            "hasUpgrades": {
                "hylian": ["true"],
                "gerudo": ["true"],
				"goron": ["false"],
				"zora": ["false"],
				"kokiri": ["false"],
				"gohma": ["false"],
				"ordona": ["false"],
				"lanayru": ["false"],
				"moblin": ["false"],
				"darknut": ["false"],
				"deku": ["false"],
				"lizalfos": ["false"],
				"labrynna": ["false"],
				"fairy": ["false"],
            },

            // since most techs have no significance as of yet, the ones that should be considered will be put here manually (tech name, building, priority (high, medium = 1.75, low = 2.5, very low = 5))
            // priority will be based on total resource count where high will be researched asap, while low prio will require the AI to hold at least double the resources required for the tech before researching
            "Techs":
            {
                "hylian":
                    [
						{ "name": "hylian/soldier_archer", "building": "Archery Range", "priority": "medium" },// Unit Line Upgrades
						{ "name": "hylian/soldier_cavalry", "building": "Urban Stables", "priority": "medium" },
						{ "name": "hylian/light_cavalry", "building": "Urban Stables", "priority": "medium" },
						{ "name": "hylian/kingdom_cavalry", "building": "Urban Stables", "priority": "medium" },
						{ "name": "hylian/soldier_maceman", "building": "Kingdom Barracks", "priority": "medium" },
						{ "name": "hylian/soldier_spearman", "building": "Kingdom Barracks", "priority": "medium" },
						{ "name": "hylian/soldier_swordsman", "building": "Kingdom Barracks", "priority": "medium" },
						{ "name": "hylian/kingdom_maceman", "building": "Kingdom Barracks", "priority": "medium" },
						{ "name": "hylian/kingdom_spearman", "building": "Kingdom Barracks", "priority": "medium" },
						{ "name": "hylian/kingdom_swordsman", "building": "Kingdom Barracks", "priority": "medium" },
						{ "name": "hylian/priestess", "building": "Church of the Goddesses", "priority": "medium" },
                        { "name": "hylian/gather_wood_ironaxes", "building": "Storehouse", "priority": "high" }, // dropsite techs
                        { "name": "hylian/gather_wood_strongeraxes", "building": "Storehouse", "priority": "medium" },
                        { "name": "hylian/gather_wood_arnaxes", "building": "Storehouse", "priority": "low" },
                        { "name": "hylian/gather_stone_shaft", "building": "Storehouse", "priority": "high" },
                        { "name": "hylian/gather_stone_peasants", "building": "Storehouse", "priority": "medium" },
                        { "name": "hylian/gather_stone_prisoners", "building": "Storehouse", "priority": "low" },
                        { "name": "hylian/gather_rupee_chisel", "building": "Storehouse", "priority": "high" },
                        { "name": "hylian/gather_rupee_separation", "building": "Storehouse", "priority": "medium" },
                        { "name": "hylian/gather_rupee_blastharvest", "building": "Storehouse", "priority": "low" },
                        { "name": "hylian/gather_hyl_capacity_basket", "building": "Storehouse", "priority": "medium" },
                        { "name": "hylian/gather_hyl_capacity_wheelbarrow", "building": "Storehouse", "priority": "low" },
                        { "name": "hylian/gather_vigjaro_wicker", "building": "Urban Farm", "priority": "high" }, // farm techs
                        { "name": "hylian/gather_peahat_fertilizer", "building": "Urban Farm", "priority": "high" },
                        { "name": "hylian/trade_malo_mart", "building": "Kingdom Market Plaza", "priority": "high" }, // market techs
                        { "name": "hylian/trade_hateno_dyes", "building": "Kingdom Market Plaza", "priority": "medium" }, 
                        { "name": "hylian/glass_rupees", "building": "Town Hall", "priority": "medium" }, // civil centre techs
                        { "name": "hylian/attack_hyl_infantry_melee_01", "building": "Blacksmith", "priority": "medium" }, // blacksmith techs
                        { "name": "hylian/attack_hyl_infantry_ranged_01", "building": "Blacksmith", "priority": "medium" },
                        { "name": "hylian/attack_hyl_cavalry_01", "building": "Blacksmith", "priority": "medium" },
                        { "name": "hylian/armor_hyl_all_01", "building": "Blacksmith", "priority": "medium" },  
                        { "name": "hylian/attack_hyl_infantry_melee_02", "building": "Blacksmith", "priority": "low" },  
                        { "name": "hylian/attack_hyl_infantry_ranged_02", "building": "Blacksmith", "priority": "low" },  
                        { "name": "hylian/attack_hyl_cavalry_02", "building": "Blacksmith", "priority": "low" },
                        { "name": "hylian/armor_hyl_all_02", "building": "Blacksmith", "priority": "low" },  
                        { "name": "hylian/hylian_gloryofhyrule", "building": "Castle", "priority": "medium" }, // castle techs
                        { "name": "hylian/hylian_shields", "building": "Castle", "priority": "medium" },
                        { "name": "hylian/tower_arrowshooters", "building": "Kingdom Guard Tower", "priority": "medium" }, // tower techs
                        { "name": "hylian/tower_meticulations", "building": "Kingdom Guard Tower", "priority": "medium" }, 
                        { "name": "hylian/tower_crenellations", "building": "Kingdom Guard Tower", "priority": "medium" }, 
                        { "name": "hylian/zeldaV_pavise", "building": "Archery Range", "priority": "high" }, // Hero Specific techs
                        { "name": "hylian/rauru_resistant", "building": "Church of the Goddesses", "priority": "high" },
                        { "name": "hylian/krin_damage_upgrade", "building": "Kingdom Barracks", "priority": "high" }
                    ],
                "gerudo":
                    [
                        { "name": "gerudo/gather_wood_zaldorfaxes", "building": "Supply Mill", "priority": "high" }, // dropsite techs
                        { "name": "gerudo/gather_wood_palmskin", "building": "Supply Mill", "priority": "medium" },
                        { "name": "gerudo/gather_wood_endgrain", "building": "Supply Mill", "priority": "low" },
                        { "name": "gerudo/gather_stone_artificer", "building": "Supply Mill", "priority": "high" },
                        { "name": "gerudo/gather_stone_bulkwork", "building": "Supply Mill", "priority": "medium" },
                        { "name": "gerudo/gather_stone_manslaves", "building": "Supply Mill", "priority": "low" },
                        { "name": "gerudo/gather_rupee_leevertooth", "building": "Supply Mill", "priority": "high" },
                        { "name": "gerudo/gather_rupee_ishafinder", "building": "Supply Mill", "priority": "medium" },
                        { "name": "gerudo/gather_rupee_ruvaraexec", "building": "Supply Mill", "priority": "low" },
                        { "name": "gerudo/gather_ger_capacity_gadura", "building": "Supply Mill", "priority": "medium" },
                        { "name": "gerudo/trade_isha_trinket", "building": "Barter Outlet", "priority": "high" }, // market techs
                        { "name": "gerudo/trade_camel_aid", "building": "Barter Outlet", "priority": "medium" },
                        { "name": "gerudo/kovalian_weave", "building": "Palace", "priority": "low" }, // civil centre techs
                        { "name": "gerudo/attack_ger_infantry_melee_01", "building": "Weapon Cache", "priority": "low" }, // blacksmith techs
                        { "name": "gerudo/attack_ger_infantry_melee_02", "building": "Weapon Cache", "priority": "very low" }, 
                        { "name": "gerudo/attack_ger_infantry_ranged_01", "building": "Weapon Cache", "priority": "low" }, 
                        { "name": "gerudo/attack_ger_infantry_ranged_02", "building": "Weapon Cache", "priority": "very low" }, 
                        { "name": "gerudo/attack_ger_cavalry_01", "building": "Weapon Cache", "priority": "low" }, 
                        { "name": "gerudo/spirit_trials", "building": "Gerudo Training Grounds", "priority": "low" }, // Training Grounds techs
                        { "name": "gerudo/mystathi_lore", "building": "Gerudo Training Grounds", "priority": "low" }, 
                        { "name": "gerudo/tourney_wounds", "building": "Tourney Field", "priority": "very low" }, // Tourney Field techs
                        { "name": "gerudo/toruma_clay", "building": "Masonry", "priority": "very low" }, // Masonry techs
                        { "name": "gerudo/palu_const", "building": "Masonry", "priority": "very low" }, 
                        { "name": "gerudo/karusa_kilns", "building": "Masonry", "priority": "very low" }, 
                        { "name": "gerudo/seal_tali_horn", "building": "Sandseal Pen", "priority": "very low" }, // Sandseal techs
                        { "name": "gerudo/seal_shabonne_saddles", "building": "Sandseal Pen", "priority": "very low" }, // Sandseal techs
                        { "name": "gerudo/gerudo_mirrorshield", "building": "Spirit Altar", "priority": "low" }, // Temple techs
                        { "name": "gerudo/ancestral_spirit", "building": "Spirit Altar", "priority": "very low" },
                        { "name": "gerudo/wind_of_death", "building": "Spirit Altar", "priority": "very low" },
                        { "name": "gerudo/nabooru_kovaloogift", "building": "Palace", "priority": "high" }, // Hero Specific Techs
                        { "name": "gerudo/riju_rapidbows", "building": "Weapon Cache", "priority": "high" },
                        { "name": "gerudo/urbosa_goldenarmor", "building": "Gerudo Training Grounds", "priority": "high" },
                        { "name": "gerudo/ganondorf_ancarmor", "building": "Gerudo Stables", "priority": "high" },
                        { "name": "gerudo/buliara_spearupgrade", "building": "Security Compound", "priority": "high" }
                    ],
                "zora":
                    [
                        { "name": "zora/armor_coralloom", "building": "Ministry", "priority": "medium" }, // Civil Center techs
                        { "name": "zora/telara_armblade", "building": "Ministry", "priority": "high" },
                        { "name": "zora/zaleen_supreme", "building": "Ministry", "priority": "high" },
                        { "name": "zora/trade_watertunic", "building": "Market Circle", "priority": "high" }, // Market techs
                        { "name": "zora/trade_archpatron", "building": "Market Circle", "priority": "low" },
                        { "name": "zora/healer_battleprep", "building": "Mage Chambers", "priority": "low" }, // Mage techs
                        { "name": "zora/healer_zodobon", "building": "Mage Chambers", "priority": "high" },
                        { "name": "zora/troop_rutalancrystal", "building": "Mage Chambers", "priority": "medium" },
                        { "name": "zora/troop_ulriawaves", "building": "Mage Chambers", "priority": "medium" }, 
                        { "name": "zora/troop_akkalanflames", "building": "Mage Chambers", "priority": "medium" }, 
                        { "name": "zora/troop_overchargedcore", "building": "Mage Chambers", "priority": "medium" }, 
                        { "name": "zora/troop_coredivision", "building": "Mage Chambers", "priority": "medium" }, 
                        { "name": "zora/laruto_fasting", "building": "Mage Chambers", "priority": "high" },  
                        { "name": "zora/troop_lutoboomerang", "building": "Dormitory", "priority": "medium" }, // Barracks techs
                        { "name": "zora/ruto_nayrushield", "building": "Dormitory", "priority": "high" }, 
                        { "name": "zora/attack_coralboundsteel", "building": "Coralmold Crafter", "priority": "medium" }, // Blacksmith techs
                        { "name": "zora/armor_crystalweave", "building": "Coralmold Crafter", "priority": "low" }, 
                        { "name": "zora/attack_shatterback", "building": "Coralmold Crafter", "priority": "medium" }, 
                        { "name": "zora/building_kenozooid", "building": "Coralmold Crafter", "priority": "low" }, 
                        { "name": "zora/building_crystalheart", "building": "Library", "priority": "low" }, // Library techs
                        { "name": "zora/building_coralpure", "building": "Library", "priority": "medium" }, 
                        { "name": "zora/temple_goldengird", "building": "Library", "priority": "medium" }, 
                        { "name": "zora/troop_terrupbring", "building": "Hydrophant Nest", "priority": "medium" }, // Hydrophant techs 
                        { "name": "zora/troop_galliantarmor", "building": "Hydrophant Nest", "priority": "medium" }, 
                        { "name": "zora/debon_hydrofrenzy", "building": "Hydrophant Nest", "priority": "high" }, 
                        { "name": "zora/gather_capacity_reefletcasing", "building": "Depository", "priority": "high" }, //Dropsite techs
                        { "name": "zora/economic_algalcleanse", "building": "Depository", "priority": "medium" }, 
                        { "name": "zora/economic_coralablation", "building": "Depository", "priority": "low" }, 
                        { "name": "zora/commune_mandatequarters", "building": "Commune", "priority": "medium" }, //Housing techs
                        { "name": "zora/commune_fishpond", "building": "Commune", "priority": "medium" }
                    ]
            },

            // attach the buildings here in the order that you want the AI to build them in (at the start of a match)
            // (non standard buildings require full path), standard buildings should be written as an abbreviated string (Field, House, Dropsite, CivilCenter, Tower, Market)
            "StartStrategy": {
                "hylian": ["structures/hylian/hylian_barracks", "House", "Dropsite", "Field", "House"],
                "gerudo": ["structures/gerudo/gerudo_barracks", "House", "Dropsite", "Field", "House"],
				"goron": ["House", "Dropsite", "Field", "House", "structures/goron/goron_barracks"],
                "zora": ["structures/zora/zora_barracks", "House", "Dropsite", "Field", "structures/zora/zora_farmstead", "House"],
				"kokiri": ["structures/kokiri/kokiri_grove_market", "structures/kokiri/kokiri_grove_barracks"],
				"gohma": ["Field", "structures/gohma/gohma_blacksmith", "House", "Dropsite",  "House", "structures/gohma/gohma_market"],
				"ordona": ["House", "Dropsite", "Field", "House", "structures/ordona/ordona_barracks", "structures/ordona/ordona_market"],
				"lanayru": ["structures/lanayru/lanayru_hub_barracks"],
				"moblin": ["Field", "structures/moblin/moblin_barracks", "House", "Dropsite",  "House", "Dropsite",  "House", "Dropsite",  "House", "structures/moblin/moblin_barracksA", "structures/moblin/moblin_barracksB", "Field", "House", "Dropsite", "structures/moblin/moblin_barracksC", "structures/moblin/moblin_barracksD", "House", "House", "House","structures/moblin/moblin_totem","structures/moblin/moblin_totem","structures/moblin/moblin_totem","structures/moblin/moblin_totem","structures/moblin/moblin_totem", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "House", "Dropsite", "structures/moblin/moblin_wonder", "House"  ],
				"darknut": ["House", "Dropsite", "Field", "House", "structures/darknut/darknut_barracks"],
				"deku": ["House", "Dropsite", "Field", "House", "structures/deku/deku_barracks"],
				"lizalfos": ["House", "Dropsite", "Field", "House", "structures/lizalfos/lizalfos_barracks_F"],
				"labrynna": [ "House", "Dropsite", "Field", "House", "structures/labrynna/labrynna_barracks", "structures/labrynna/labrynna_market"],
				"fairy": ["structures/fairy/fairy_menhirA_spring", "structures/fairy/fairy_menhirA_spring", "structures/fairy/fairy_menhirA_spring", "structures/fairy/fairy_menhirA_spring", "structures/fairy/fairy_menhirA_spring", "structures/fairy/fairy_menhirA_spring", "structures/fairy/fairy_menhirA_spring", "fairy_fountainA_spring"],
            },

            // most factions need particular resources as fast as possible, this option will ban certain resources until the startstrategy has been executed
            // false = not banned, true = banned for that duration
            "StartStrategyBan": {
                "hylian": [{ "food": false, "wood": false, "stone": true, "metal": true, "treasure": false }],
                "gerudo": [{ "food": false, "wood": false, "stone": true, "metal": true, "treasure": false }],
				"goron": [{ "food": false, "wood": false, "stone": false, "metal": true, "treasure": false }],
				"zora": [{ "food": false, "wood": false, "stone": false, "metal": true, "treasure": false }],
				"kokiri": [{ "food": false, "wood": false, "stone": false, "metal": false, "treasure": false }],
				"gohma": [{ "food": false, "wood": false, "stone": false, "metal": false, "treasure": false }],
				"ordona": [{ "food": false, "wood": false, "stone": true, "metal": true, "treasure": false }],
				"lanayru": [{ "food": false, "wood": false, "stone": true, "metal": true, "treasure": false }],
				"moblin": [{ "food": false, "wood": false, "stone": false, "metal": false, "treasure": false }],
				"darknut": [{ "food": false, "wood": false, "stone": false, "metal": true, "treasure": false }],
				"deku": [{ "food": false, "wood": false, "stone": true, "metal": true, "treasure": false }],
				"lizalfos": [{ "food": false, "wood": false, "stone": false, "metal": false, "treasure": false }],
				"labrynna": [{ "food": false, "wood": false, "stone": false, "metal": false, "treasure": false }],
				"fairy": [{ "food": false, "wood": false, "stone": true, "metal": true, "treasure": false }],
            },

            // attach network buildings here for factions that have them , (first element = building path, second element = (radius = true, interconnected = false))
            "network": {
                "zora": ["structures/zora/zora_aquepool", false],
                "gohma": ["structures/gohma/gohma_temple", true],
            },

            // The min battalion pop required per extra expansion for the AI to consider building a new civil center
            "PopPerExpansion": {
                "hylian": [60],
                "gerudo": [60],
                "goron": [150],
                "zora": [100],
                "kokiri": [100],
                "gohma": [150],
                "ordona": [100],
                "lanayru": [150],
				"moblin": [100],
				"darknut": [50],
				"deku": [100],
				"lizalfos": [85],
				"labrynna": [85],
				"fairy": [75],
            },

            // The min battalion pop required to phase up (first element = town phase, second element = city phase)
            "PhaseUpMinPop": {
                "hylian": [25, 40],
                "gerudo": [25, 40],
                "goron": [50, 80],
                "zora": [25, 40],
                "kokiri": [50, 80],
                "gohma": [50, 80],
                "ordona": [50, 80],
                "lanayru": [50, 80],
				"moblin": [50, 80],
				"darknut": [40, 80],
                "deku": [40, 80],
				"lizalfos": [40, 80],
				"labrynna": [40, 80],
				"fairy": [40, 80],
            },

            // first value: the percentage of traders the AI wants in comparison to the limit pop (0.2 = 20%), second value: min number of traders wanted, third value: max number of traders considered
            "TraderPercentage": {
                "hylian": [0.3, 2, 20],
                "gerudo": [0.3, 2, 20],
                "goron": [0.17],
                "zora": [0.3, 2, 20],
                "kokiri": [0.17],
                "gohma": [0.17],
                "ordona": [0.17],
                "lanayru": [0.17],
				"moblin": [0.17],
				"darknut": [0.17],
				"deku": [0.17],
				"lizalfos": [0.17],
				"labrynna": [0.17],
				"fairy": [0.17],
            },

            // first value: the percentage of citizens the AI wants in comparison to the limit pop (0.2 = 20%), second value: min number of battalions wanted, third value: max number of battalions considered
            "CitizenPercentage": {
                "hylian": [0.35, 10, 16],
                "gerudo": [0.35, 10, 16],
                "goron": [0.23],
                "zora": [0.35, 10, 16],
                "kokiri": [0.23],
                "gohma": [0.23],
                "ordona": [0.23],
                "lanayru": [0.23],
				"moblin": [0.23],
				"darknut": [0.23],
				"deku": [0.23],
				"lizalfos": [0.23],
				"labrynna": [0.23],
				"fairy": [0.23],
            },

            // first value: the min battalion pop required for the AI to consider training their first selected hero, second value: min pop second hero, third value: min pop third hero
            "HeroMinPop": {
                "hylian": [30, 45, 60],
                "gerudo": [30, 45, 60],
                "goron": [75],
                "zora": [30, 45, 60],
                "kokiri": [75],
                "gohma": [75],
                "ordona": [75],
                "lanayru": [75],
				"moblin": [75],
				"darknut": [75],
				"deku": [75],
				"lizalfos": [75],
				"labrynna": [75],
				"fairy": [75],
            }
        };     

        // Default personality (will be updated in setConfig)
        this.personality =
            {
                "aggressive": 0.5,
                "cooperative": 0.5,
                "defensive": 0.5
            };
    };

    m.Config.prototype.setConfig = function (gameState) {
        if (this.difficulty > 0)
        {

        }
    };

    m.Config.prototype.Serialize = function () {
    };

    m.Config.prototype.Deserialize = function (data) {
    };

    return m;
}(CONQUESTAI);
