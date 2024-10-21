// gohma queen duplicate problem 
// loading screen for the mission

{
    var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    var cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);
    var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);

    cmpTrigger.Nests = TriggerHelper.GetPlayerEntitiesByClass(0, "HiveNest"); // the 4 nests located on the map
    cmpTrigger.Agitha = 184; // reference to Agitha
    cmpTrigger.Mido = 185; // reference to Mido
    cmpTrigger.Impa = 9519; // reference to Impa
    cmpTrigger.ImpaStartLocation = { x: 1032, z: 1210, rot: -2.77555 };
    cmpTrigger.playerArmy = TriggerHelper.GetPlayerEntitiesByClass(1, "Gohma");
    cmpTrigger.allCitizens = TriggerHelper.GetAllPlayersEntitiesByClass("FemaleCitizen");
    cmpTrigger.allBuildings = TriggerHelper.GetPlayerEntitiesByClass(2, "Structure");

    cmpTrigger.Castle = 7; // the ID of Malkariko Castle
    cmpTrigger.farmNest = 9516; // reference to the buried farm nest
    cmpTrigger.housingNest = 9517; // reference to the buried residential district nest
    cmpTrigger.militaryNest = 9518; // reference to the buried military district nest
    cmpTrigger.gardenNest = 9515; // reference to the buried garden district nest

    cmpTrigger.hylianDefenceTimer = 0;
    cmpTrigger.militaryNestTriggered = false;
    cmpTrigger.timeBetweenSpawns = 180000;
    cmpTrigger.amountSpawned = { elite: 3, regular: 7, militia: 9, castle: 2, stableElite: 2, stableRegular: 4 }; // amount spawned
    cmpTrigger.spawnedArmy = []; // reference to the spawned hylian armies
    cmpTrigger.trainTemplateLists = // list of templates used for hylian training
    {
        barracksElite: ["units/hylian/hylian_kingdom_swordsman", "units/hylian/malkariko_knightofhyrule_b" ], // barracks trainable elites
        barracksRegular: ["units/hylian/hylian_kingdom_swordsman", "units/hylian/malkariko_crossbowman_b", "units/hylian/hylian_kingdom_spearman"], // barracks trainable regulars
        barracksMilitia: ["units/hylian/hylian_levy_swordsman", "units/hylian/hylian_levy_maceman", "units/hylian/malkariko_town_guard_b", "units/hylian/hylian_levy_spearman"], // barracks trainable militia
        castle: ["units/hylian/hylian_knightofhyrule_b"] // castle elites
    } 

    cmpTrigger.ControlledHives = []; // keep track of the number of hives already triggered
    cmpTrigger.CutsceneDialogs = []; // holds all the timers of queued dialogs for cutscenes for potential cancelling by the player
    cmpTrigger.TutorialDialogs = []; // holds all the timers of queued dialogs for tutorial sections for potential faster reaction by the player
    cmpTrigger.InTutorial = false;
    cmpTrigger.TutorialStep = 0;
    cmpTrigger.musicTimer = 0;

    // manual list of ids that need to be garrisoned by the AI at the start
    cmpTrigger.garrisonObjects = [
        { ent: 165, amount: 2 },
        { ent: 166, amount: 2 },
        { ent: 175, amount: 2 },
        { ent: 176, amount: 2 },
        { ent: 134, amount: 3 },
        { ent: 133, amount: 3 },
        { ent: 132, amount: 3 },
        { ent: 131, amount: 3 },
        { ent: 130, amount: 3 },
        { ent: 79, amount: 3 },
        { ent: 68, amount: 3 },
        { ent: 67, amount: 3 },
        { ent: 66, amount: 3 },
        { ent: 93, amount: 3 },
        { ent: 91, amount: 3 },
        { ent: 90, amount: 3 },
        { ent: 89, amount: 3 },
        { ent: 44, amount: 3 },
        { ent: 46, amount: 3 },
        { ent: 47, amount: 3 },
        { ent: 48, amount: 3 },
        { ent: 123, amount: 3 },
        { ent: 103, amount: 3 },
        { ent: 101, amount: 3 },
        { ent: 99, amount: 3 },
        { ent: 153, amount: 3 },
        { ent: 154, amount: 3 },
        { ent: 155, amount: 3 },
        { ent: 152, amount: 3 },
        { ent: 83, amount: 3 },
        { ent: 82, amount: 3 },
        { ent: 81, amount: 3 },
        { ent: 75, amount: 3 },
        { ent: 150, amount: 3 },
        { ent: 149, amount: 3 },
        { ent: 148, amount: 3 },
        { ent: 145, amount: 3 },
        { ent: 57, amount: 3 },
        { ent: 58, amount: 3 },
        { ent: 59, amount: 3 },
        { ent: 60, amount: 3 }
    ];

    cmpTrigger.marketUnits = // holds the units defending the market square near the bridge
        [9483, 9484, 9479, 9480, 9485, 9481, 9486, 9482, 9487, // foot knights
            9460, 9461, 9462, 9463, 9464, 9465, 9466, 9467, // crossbowmen west
            9468, 9469, 9470, 9471, 9472, 9473, 9474, 9475, 9478]; // crossbowmen east

    cmpTrigger.housingGuards = [9602, 9603, 9604, 9605, 9606]; // trigger for housing assault
    cmpTrigger.gardenGuards = [3068, 3067, 3069, 3070]; // trigger for garden assault

    cmpTrigger.RegisterTrigger("OnPlayerCommand", "PlayerCommandAction", { "enabled": true });
    cmpTrigger.RegisterTrigger("OnUpgradeFinished", "UpgradeFinishedAction", { "enabled": true }); //receive the upgrade trigger 
    cmpTrigger.RegisterTrigger("OnEntityDeath", "EntityDeathAction", { "enabled": true }); //receive the upgrade trigger 
    cmpTrigger.RegisterTrigger("OnHealthChanged", "HealthChangedAction", { "enabled": false });

    // Nest Triggers + Market Bridge Dialogue
    cmpTrigger.RegisterTrigger("OnRange", "RangeMalkarikoCastle", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("J"), players: [1, 4], minRange: 0, maxRange: 50, requiredComponent: IID_UnitAI }); // trigger for gohma units getting close to the castle
    cmpTrigger.RegisterTrigger("OnRange", "RangeMarketBridge", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("A"), players: [1], minRange: 0, maxRange: 50, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeNestFarm", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("B"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeNestMilitary", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("C"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeNestGarden", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("D"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeNestHousing", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("E"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI });

    // spawned armies near gates
    cmpTrigger.RegisterTrigger("OnRange", "RangeGateMilitary", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("F"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeGateKeep", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("G"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeGateHousing", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("H"), players: [1], minRange: 0, maxRange: 30, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "RangeGateWood", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("I"), players: [1], minRange: 0, maxRange: 45, requiredComponent: IID_UnitAI });

    // skultula spawns
    cmpTrigger.RegisterTrigger("OnRange", "RangeSkulltulaA", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("K"), players: [1], minRange: 0, maxRange: 45, requiredComponent: IID_UnitAI });
    cmpTrigger.RegisterTrigger("OnRange", "RangeSkulltulaB", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("L"), players: [1], minRange: 0, maxRange: 45, requiredComponent: IID_UnitAI });
    cmpTrigger.RegisterTrigger("OnRange", "RangeSkulltulaC", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("M"), players: [1], minRange: 0, maxRange: 45, requiredComponent: IID_UnitAI }); 

    let cmpTechnologyManager = QueryPlayerIDInterface(1, IID_TechnologyManager);
    cmpTechnologyManager.ResearchTechnology("civ_choices/gohma/choosehero_agitha"); // research arbitrary civ choice to prevent the civ choice window from showing up
    cmpTechnologyManager.ResearchTechnology("phase_town"); // town phase for upgrades and the ability to create more hives

    cmpTrigger.DoAfterDelay(100, "SendCinematicRequest",
        {
            dialogue: "Would you like to see the intro cinematic affiliated with this mission?\n\n\n " +
                "NOTE: There is currently no video support available. Therefore, a web url will be opened that contains this cinematic with the game paused automagically.\n " +
                "When the cinematic is finished, you can resume playing the game manually by pressing the resume game button.",
            url: "https://youtu.be/o6OlsmG8DS0"
        }
    );

    cmpTrigger.DoAfterDelay(200, "Intro1", {});
    cmpTrigger.DoAfterDelay(1000, "PostInit", {});
    cmpTrigger.DoAfterDelay(2000, "GarrisonBuildings", {}); // garrison crossbows inside the towers
}

Trigger.prototype.PostInit = function ()
{
    cmpTrigger.citizenGroupVillage = this.GetEntsInsideSquare(this.allCitizens, 1150, 2048, 0, 560); // get the citizens in the outer eastern village section 
    cmpTrigger.citizenGroupVillage2 = this.GetEntsInsideSquare(this.allCitizens, 1375, 2048, 560, 750);
    cmpTrigger.citizenGroupMarket = this.GetEntsInsideSquare(this.allCitizens, 805, 1243, 591, 931);
    cmpTrigger.citizenGroupGarden = this.GetEntsInsideSquare(this.allCitizens, 1162, 1463, 783, 1141);
    cmpTrigger.citizenGroupHousing = this.GetEntsInsideSquare(this.allCitizens, 1391, 1829, 857, 1498);

    cmpTrigger.buildingGroupGarden = this.GetEntsInsideSquare(this.allBuildings, 1231, 1431, 808, 1008);
    cmpTrigger.buildingGroupHousing = this.GetEntsInsideSquare(this.allBuildings, 1495, 1695, 1304, 1504);
    cmpTrigger.buildingGroupMilitary = this.GetEntsInsideSquare(this.allBuildings, 628, 828, 774, 974);

    let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    cmpRangeManager.SetSharedLos(1, [1, 4]); // the player should be able to see what the gohma nest player sees

    this.FluffDialogueVillage();
    this.FluffDialogueForest();
    this.FluffDialogueFarm();

    //this.SetInvulnerability(this.Mido, true);
    //Engine.QueryInterface(this.Mido, IID_Position).JumpTo(, this.ImpaStartLocation.z); // used for debugging only
}

Trigger.prototype.GetEntsInsideSquare = function (list, minX, maxX, minZ, maxZ)
{
    let newList = [];
    for (let ent of list)
    {
        let pos = Engine.QueryInterface(ent, IID_Position).GetPosition2D();
        if (pos.x > minX && pos.x < maxX && pos.y > minZ && pos.y < maxZ)
            newList.push(ent);
    }
    return newList;
}

Trigger.prototype.HylianDefence = function ()
{
    if (this.ControlledHives[0] == undefined) // if the base is lost, the mission is probably lost already
        return;

    if (this.militaryNestTriggered == false) // only spawn the elites and the cavalry if the military district is controlled by the Hylians
    {
        for (let i = 0; i < this.amountSpawned.stableRegular; i++)
            this.spawnedArmy.push(this.SpawnUnit({ x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, angle: 0, template: "units/hylian/hylian_kcavalry_b", owner: 3 }));

        for (let i = 0; i < this.amountSpawned.stableElite; i++)
            this.spawnedArmy.push(this.SpawnUnit({ x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, angle: 0, template: "units/hylian/hylian_chevalier_b", owner: 3 }));

        for (let i = 0; i < this.amountSpawned.elite; i++)
            this.spawnedArmy.push(this.SpawnUnit({ x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, angle: 0, template: pickRandom(this.trainTemplateLists.barracksElite), owner: 3 }));

        for (let i = 0; i < this.amountSpawned.castle; i++)
            this.spawnedArmy.push(this.SpawnUnit({ x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, angle: 0, template: pickRandom(this.trainTemplateLists.castle), owner: 3 }));
    }

    // spawn regular, militia and specific castle units here that will continue regardless of hives captured  
    for (let i = 0; i < this.amountSpawned.regular; i++)
        this.spawnedArmy.push(this.SpawnUnit({ x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, angle: 0, template: pickRandom(this.trainTemplateLists.barracksRegular), owner: 3 }));
    for (let i = 0; i < this.amountSpawned.militia; i++)
        this.spawnedArmy.push(this.SpawnUnit({ x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, angle: 0, template: pickRandom(this.trainTemplateLists.barracksMilitia), owner: 3 }));

    this.UpdateList(this.spawnedArmy); // could still be leftovers and or dead units from the last spawn, so update first

    let randHive = 0; // get AI controlled hive if possible
    if (this.ControlledHives.length > 1)
        randHive = this.ControlledHives[randIntInclusive(1, +this.ControlledHives.length - 1)].newID;
    if (Engine.QueryInterface(randHive, IID_Health) == undefined)
        randHive = this.ControlledHives[0].newID;

    let hivePos = Engine.QueryInterface(randHive, IID_Position).GetPosition2D(); // get rand hive pos
    this.AttackCommand(hivePos.x, hivePos.y, this.spawnedArmy, 3, false); // attack that position
   
    this.hylianDefenceTimer = cmpTrigger.DoAfterDelay(this.timeBetweenSpawns, "HylianDefence", {}); //recall hylian defence spawn after set timer
};

Trigger.prototype.ImpaTriggerHive2 = function (data)
{
    cmpTimer.CancelTimer(this.hylianDefenceTimer); // attack trigger, cancel the standard hylian defence timer for now
    this.hylianDefenceTimer = -1; // -1 to notify the code it was forcibly disabled

    this.UpdateList(this.spawnedArmy); // could still be leftovers and or dead units from other spawns, so update first
    this.spawnedArmy = this.spawnedArmy.concat(TriggerHelper.SpawnUnits(this.Castle, "units/hylian/hylian_knightofhyrule_b", 8, 3));
    this.spawnedArmy = this.spawnedArmy.concat(TriggerHelper.SpawnUnits(this.Castle, "units/hylian/hylian_ironclad_b", 2, 3));
    this.spawnedArmy = this.spawnedArmy.concat(TriggerHelper.SpawnUnits(this.Castle, "units/hylian/hylian_castle_guard_b", 15, 3));
    this.spawnedArmy = this.spawnedArmy.concat(TriggerHelper.SpawnUnits(this.Castle, "units/hylian/hylian_flailknight_b", 8, 3));

    cmpTrigger.EnableTrigger("OnHealthChanged", "HealthChangedAction"); // enable fleeing from Impa when wounded
    let firstUnitPos2D = Engine.QueryInterface(this.spawnedArmy[0], IID_Position).GetPosition2D();
    Engine.QueryInterface(this.Impa, IID_Position).JumpTo(firstUnitPos2D.x, firstUnitPos2D.y); // set Impa near the spawned units

    let hivePos = Engine.QueryInterface(data.newID, IID_Position).GetPosition2D(); // get the pos of the second hive
    this.AttackCommand(hivePos.x, hivePos.y, this.spawnedArmy, 3, false); // attack that position
    this.AttackCommand(hivePos.x, hivePos.y, [this.Impa], 2, false);
}

Trigger.prototype.GarrisonBuildings = function ()
{
    for (let data of this.garrisonObjects)
    {
        TriggerHelper.SpawnGarrisonedUnits(data.ent, "units/hylian/malkariko_crossbowman_b", data.amount, 3); // spawn crossbowmen inside all towers and buildings that require it
    }

    cmpTrigger.castleUnits = [];
    // spawning of the castle is divided into 3 calls to get the repeaters at the right location
    this.castleUnits = TriggerHelper.SpawnGarrisonedUnits(this.Castle, "units/hylian/hylian_crossbowman_b", 4, 2);
    this.castleUnits = this.castleUnits.concat(TriggerHelper.SpawnGarrisonedUnits(this.Castle, "units/hylian/malkariko_repeater", 2, 2));
    this.castleUnits = this.castleUnits.concat(TriggerHelper.SpawnGarrisonedUnits(this.Castle, "units/hylian/hylian_crossbowman_b", 8, 2));
};

Trigger.prototype.NestVicinityDialogue = function (name) 
{   
    if (this.ControlledHives.length < 1) { // if no hive has been created yet, show the base dialogue
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh lookie, it's the " + name + " Nest!||255 255 0||, Uncover it so we can start constructing our base! ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });
        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
    }
    else // if the player already controls a hive, inform the player inside the dialogue this instance will create an allied base
    {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh lookie, it's the " + name + " Nest!||255 255 0||, Uncover it so we can create an ||Autonomous Gohma Hive||0 128 128|| that unleashes their hordes upon the defenders! ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });
        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
    }
};

Trigger.prototype.FluffDialogueVillage = function () // occurs when Agitha and Mido enter the village to the east
{
    let cmpPos = Engine.QueryInterface(this.Agitha, IID_Position);
    if (cmpPos == undefined) // if Agitha is dead, the mission is lost so return to prevent errors
        return;

    let posAgitha = cmpPos.GetPosition2D();
    if (this.SquareVectorDistance([posAgitha.x, posAgitha.y], [1408, 354]) < 50 * 50) {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh what a nice little sleepy village here, nothing like the big place I grew up in. ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "Tiny and poor as the ||Kokiri||0 255 0|| village I hailed from. ",
                soundIndex: 0,
                portraitSuffix: "_neutral"
            });

        cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "No no, that's what makes it great! ",
                soundIndex: 0,
                portraitSuffix: "_victorious"
            });

        cmpTrigger.DoAfterDelay(18000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "Speaketh for yourself, I desire far more grander living! ",
                soundIndex: 0,
                portraitSuffix: "_angry"
            });

        cmpTrigger.DoAfterDelay(24000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Oh poor ||Mido||255 0 0||, if only you knew... ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });
        cmpTrigger.DoAfterDelay(30000, "CloseDialogueWindow", {});
    }
    else
        cmpTrigger.DoAfterDelay(1000, "FluffDialogueVillage", {});
}

Trigger.prototype.FluffDialogueForest = function ()
{
    let cmpPos = Engine.QueryInterface(this.Agitha, IID_Position);
    if (cmpPos == undefined) // if Agitha is dead, the mission is lost so return to prevent errors
        return;

    let posAgitha = cmpPos.GetPosition2D();
    if (this.SquareVectorDistance([posAgitha.x, posAgitha.y], [833, 1856]) < 50 * 50) {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh lookie, these woods are full of deer and rabbits! This must be the King's hunting ground when he stays at this Castle. ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(8000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "If we're running low on food we could probably add some of these animals to the stocks. ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });
        cmpTrigger.DoAfterDelay(14000, "CloseDialogueWindow", {});
    }
    else
        cmpTrigger.DoAfterDelay(1000, "FluffDialogueForest", {});
}

Trigger.prototype.FluffDialogueFarm = function ()
{
    let cmpPos = Engine.QueryInterface(this.Agitha, IID_Position);
    if (cmpPos == undefined) // if Agitha is dead, the mission is lost so return to prevent errors
        return;

    let posAgitha = cmpPos.GetPosition2D();
    if (this.SquareVectorDistance([posAgitha.x, posAgitha.y], [366, 515]) < 200 * 200) {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh boy look at the spring harvest! Looks like mostly lettuce and cabbage! ",
                soundIndex: 0,
                portraitSuffix: "_victorious"
            });

        cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "A pity tis' only vegetables. ",
                soundIndex: 0,
                portraitSuffix: "_annoyed"
            });

        cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Nonsense, ||Gohma||0 100 0|| can feed on them! ",
                soundIndex: 0,
                portraitSuffix: "_annoyed"
            });

        cmpTrigger.DoAfterDelay(18000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "In mine own years round the ||Gohma||0 100 0||, I've never seen them eat plants. ",
                soundIndex: 0,
                portraitSuffix: "_neutral"
            });

        cmpTrigger.DoAfterDelay(24000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "||Gohma||0 100 0|| will eat anything. ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });
        cmpTrigger.DoAfterDelay(30000, "CloseDialogueWindow", {});
    }
    else
        cmpTrigger.DoAfterDelay(1000, "FluffDialogueFarm", {});
}

// activate a new gohma AI hive after the first base has been captured 
Trigger.prototype.CreateGohmaAI = function (data)
{
    let cmpEntOwnership = Engine.QueryInterface(data.hive, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(4); // set hew hive to the gohma AI faction

    data.hivePos = Engine.QueryInterface(data.hive, IID_Position).GetPosition2D(); // send the position of the structure for offset purposes
    cmpTrigger.DoAfterDelay(10000, "GohmaAIPhase1", data); // spawn eggs first
}

Trigger.prototype.GohmaAIPhase1 = function (data)
{
    if (Engine.QueryInterface(data.hive, IID_Health) == undefined || this.campaignEnd != undefined) // cancel summoning if the associated hive has been destroyed
        return;

    let offset = [-25, 25, -35, 35, -45, 45, -55, 55]; // basic offset parameters
    let ents = [];
    let maxFloored = Math.floor(Math.sqrt(data.amount)); // sqrt of the unit spawn amount floored down to get the max capable using the offset for loop
    let remainder = data.amount - (maxFloored * maxFloored); // get the remainder and spawn them in random locations
    for (let i = 0; i < maxFloored; i++) // spawn max capable using the floored calculation 
    {
        for (let j = 0; j < maxFloored; j++)
        {
            ents.push({
                id: this.SpawnBuilding({ x: data.hivePos.x + offset[i], z: data.hivePos.y + offset[j], angle: 0, template: "structures/campaign/FS_01/gohma_egg", owner: 4, asFoundation: false }),
                x: data.hivePos.x + offset[i],
                z: data.hivePos.y + offset[j]
            });
        }
    }

    for (let i = 0; i < remainder; i++) // spawn remainder in rand locations
    {
        let rand = randIntInclusive(-55, +55);
        ents.push({
            id: this.SpawnBuilding({ x: data.hivePos.x + rand, z: data.hivePos.y + rand, angle: 0, template: "structures/campaign/FS_01/gohma_egg", owner: 4, asFoundation: false }),
            x: data.hivePos.x + rand,
            z: data.hivePos.y + rand
        });
    }

    data.ents = ents;
    cmpTrigger.DoAfterDelay(10000, "GohmaAIPhase2", data); // replace eggs with units in 10 seconds
}

Trigger.prototype.GohmaAIPhase2 = function (data)
{
    for (let ent of data.ents) { this.DestroyEnt(ent.id); } // destroy eggs
    for (let i = 0; i < data.amount; i++)
    {
        let ent = this.SpawnUnit({ x: data.ents[i].x, z: data.ents[i].z, angle: 0, template: pickRandom(data.templates), owner: 4 }); // spawn unit at egg location
        this.AttackCommand(1097, 1355, [ent], 4, false); // send it to attack near castle
    }
    cmpTrigger.DoAfterDelay(120 * 1000, "GohmaAIPhase1", data); // reset summon script after 2 minutes
}

Trigger.prototype.HiveTriggered = function (data)
{
    // set penalties for the Hylians depending on which hive was just taken, also create a gohma AI if the first hive has already been uncovered
    switch (data.oldID)
    {
        case this.gardenNest: // garden
            if (this.ControlledHives.length > 1)
                this.CreateGohmaAI({ hive: data.newID, templates: ["units/gohma_princess_b", "units/gohma_spinalgohma_b", "units/gohma_pincergohma_b"], amount: 35 });

            cmpTrigger.DoAfterDelay(13000, "DialogueWindow",
                {
                    character: "Agitha",
                    dialogue: "Now that we control the ||Garden District||255 255 0||, the ||Hylians||138 43 226|| attack rate will be greatly reduced!",
                    soundIndex: 0,
                    portraitSuffix: "_happy"
                });
            cmpTrigger.DoAfterDelay(19000, "CloseDialogueWindow", {});

            this.timeBetweenSpawns *= 1.5; // garden increases the time between attacks
            break;
        case this.farmNest: // farm
            if (this.ControlledHives.length > 1)
                this.CreateGohmaAI({ hive: data.newID, templates: ["units/gohma_longlegs_b"], amount: 35 });
            break;
        case this.militaryNest: // military
            if (this.ControlledHives.length > 1)
                this.CreateGohmaAI({ hive: data.newID, templates: ["units/gohma_tank_b", "units/gohma_praetorian_b", "units/gohma_armogohma_b", "units/gohma_trapdoor_packed"], amount: 23 });

            cmpTrigger.DoAfterDelay(13000, "DialogueWindow",
                {
                    character: "Agitha",
                    dialogue: "Now that we control the ||Military District||255 255 0||, the ||Hylians||138 43 226|| won't be able to create their elite troops any longer!",
                    soundIndex: 0,
                    portraitSuffix: "_happy"
                });
            cmpTrigger.DoAfterDelay(19000, "CloseDialogueWindow", {});

            this.militaryNestTriggered = true;
            this.amountSpawned.regular += Math.floor(this.amountSpawned.regular * 1.1); // military nest prevents training of elites and cavalry, but increases the production of regulars 
            this.amountSpawned.militia += Math.floor(this.amountSpawned.militia * 1.2); // and militias in its place

            this.UpdateList(this.marketUnits);
            if (this.marketUnits.length > 0)
            {
                this.AttackCommand(728, 874, this.marketUnits, 2, false); // send market units to attack the military district if they still exist
                this.CheckRangeMarketBridge({ collection: this.marketUnits, fleeToGarden: true, fleeToMilitary: false }); // make sure to run the market unit checker
                cmpTrigger.DisableTrigger("OnRange", "RangeMarketBridge"); // and disable the market trigger
            }

            break;
        case this.housingNest: // housing
            if (this.ControlledHives.length > 1)
                this.CreateGohmaAI({ hive: data.newID, templates: ["units/gohma_pincergohma_b", "units/gohma_larva_hive_b", "units/gohma_larva_soldier_b", "units/gohma_caretaker_b"], amount: 50 });

            cmpTrigger.DoAfterDelay(13000, "DialogueWindow",
                {
                    character: "Agitha",
                    dialogue: "Now that we control the ||Residential District||255 255 0||, the ||Hylians||138 43 226|| recruitment will be greatly inhibited!",
                    soundIndex: 0,
                    portraitSuffix: "_happy"
                });
            cmpTrigger.DoAfterDelay(19000, "CloseDialogueWindow", {});

            for (let element in this.amountSpawned)
                element = Math.floor(element * 0.75); // housing district reduces number of units trained per interval by 25%
            break;
    }

    if (data.oldID != this.farmNest) // if any of the 3 hives inside the city is captured, the defenders turn their attention on those instead, no more spawning at gates
    {
        cmpTrigger.DisableTrigger("OnRange", "RangeGateMilitary");
        cmpTrigger.DisableTrigger("OnRange", "RangeGateKeep");
        cmpTrigger.DisableTrigger("OnRange", "RangeGateHousing");
    }

    if (data.oldID == this.gardenNest) { // if the garden nest is taken before the bridge event, those units will attack there instead
        this.UpdateList(this.buildingGroupGarden);
        for (let building of this.buildingGroupGarden) { Engine.QueryInterface(building, IID_Health).Kill(); } // destroy surrounding buildings
    }

    if (data.oldID == this.militaryNest)
    {
        this.UpdateList(this.buildingGroupMilitary);
        for (let building of this.buildingGroupMilitary) { Engine.QueryInterface(building, IID_Health).Kill(); } // destroy surrounding buildings
    }

    if (data.oldID == this.housingNest) {
        this.UpdateList(this.buildingGroupHousing);
        for (let building of this.buildingGroupHousing) { Engine.QueryInterface(building, IID_Health).Kill(); } // destroy surrounding buildings
    }

    switch (this.ControlledHives.length)
    {
        case 1:
            cmpTrigger.EnableTrigger("OnPlayerCommand", "PlayerCommandAction");
            this.SendGenericRequest({ dialogue: "Would you like to skip the Gohma Tutorial?", functionTrue: "HylianDefence", functionFalse: "Tutorial1", delay: 12000 })

            this.DialogueWindow(
                {
                    character: "Impa",
                    dialogue: "The ||Gohma||0 100 0|| are setting up a base! Knights of ||Hyrule!||138 43 226|| Take up arms for the defence of ||Malkariko!||173 255 47||",
                    soundIndex: 0,
                    portraitSuffix: "_angry"
                });

            cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
                {
                    character: "Agitha",
                    dialogue: "Now that the ||Hylians||138 43 226|| have been alerted, we have to be careful that we dont lose our base of operations, they will surely ||retaliate||255 0 0|| against us.",
                    soundIndex: 0,
                    portraitSuffix: "_annoyed"
                });
            cmpTrigger.DoAfterDelay(12000, "CloseDialogueWindow", {});
            break;
        case 2:
            this.DialogueWindow(
                {
                    character: "Hylian Knight",
                    dialogue: "||Lady Impa!||255 0 0|| Another ||Gohma Hive||0 100 0|| has appeared! What are your orders? ",
                    soundIndex: 2,
                    portraitSuffix: "_neutral"
                });
            cmpTrigger.DoAfterDelay(4000, "DialogueWindow",
                {
                    character: "Impa",
                    dialogue: "Forward all the reserves to that ||Gohma Nest!||0 100 0|| I want it destroyed before it overwhelmes us with its minions! ",
                    soundIndex: 0,
                    portraitSuffix: "_angry"
                });
            cmpTrigger.DoAfterDelay(6000, "ImpaTriggerHive2", data);
            cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
            break;
        case 3:
            this.DialogueWindow(
                {
                    character: "Impa",
                    dialogue: "The ||Gohma||0 100 0|| have dug up another Hive! We must repel them before its too late! ||Malkariko||173 255 47|| must stand! ",
                    soundIndex: 0,
                    portraitSuffix: "_angry"
                });
            cmpTrigger.DoAfterDelay(6000, "CloseDialogueWindow", {});
            break;
        case 4:
            this.DialogueWindow(
                {
                    character: "Impa",
                    dialogue: "This is our last stand brave soldiers of ||Hyrule!||138 43 226|| Defend ||Malkariko Castle||255 255 0|| at all cost! ",
                    soundIndex: 0,
                    portraitSuffix: "_angry"
                });
            cmpTrigger.DoAfterDelay(4000, "DialogueWindow",
                {
                    character: "Hylian Knight",
                    dialogue: "For ||Hyrule!||138 43 226|| ",
                    soundIndex: 1,
                    portraitSuffix: "_neutral"
                });
            cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
            break;
        default:
            break;
    }      
};

Trigger.prototype.Intro1 = function ()
{
    if (!cmpCinemaManager) // make sure the cinematic camera exists
        return;

    this.PlayMusic({ tracks: "gohma_theme1.ogg", resetDelay: 0 }); // play intro music

    // add all paths to the queue for the intro
    cmpCinemaManager.AddCinemaPathToQueue("IntroA");
    cmpCinemaManager.AddCinemaPathToQueue("IntroB");
    cmpCinemaManager.AddCinemaPathToQueue("IntroC");
    cmpCinemaManager.AddCinemaPathToQueue("IntroD");
    cmpCinemaManager.AddCinemaPathToQueue("IntroE");
    cmpCinemaManager.Play(); // play the full intro

    cmpTrigger.DoAfterDelay(200, "RevealMap", { state: false });

    cmpTrigger.EnableTrigger("OnPlayerCommand", "PlayerCommandAction");
    this.ActivateSkipButton({ function: "AfterIntro1", delay: 0 });

    cmpTrigger.introVisions = [];
    // vision for the market square
    this.introVisions.push(this.SpawnVision({ x: 1244, z: 863, resetDelay: 0, owner: 1, size: "large" }));
    this.introVisions.push(this.SpawnVision({ x: 1164, z: 785, resetDelay: 0, owner: 1, size: "large" })); 
    this.introVisions.push(this.SpawnVision({ x: 1078, z: 707, resetDelay: 0, owner: 1, size: "large" })); 

    // vision for final intro route back to the start section
    this.introVisions.push(this.SpawnVision({ x: 753, z: 771, resetDelay: 0, owner: 1, size: "large" }));
    this.introVisions.push(this.SpawnVision({ x: 764, z: 642, resetDelay: 0, owner: 1, size: "large" }));
    this.introVisions.push(this.SpawnVision({ x: 776, z: 505, resetDelay: 0, owner: 1, size: "large" })); 
    this.introVisions.push(this.SpawnVision({ x: 782, z: 415, resetDelay: 0, owner: 1, size: "large" }));
    this.introVisions.push(this.SpawnVision({ x: 789, z: 311, resetDelay: 0, owner: 1, size: "large" }));
    this.introVisions.push(this.SpawnVision({ x: 791, z: 240, resetDelay: 0, owner: 1, size: "large" })); 

    // add all dialog timers to the array for potential skipping by the player
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Alrighty, we need to look for one of those nests that good old ||Akazoo||255 0 0|| buried around here!",
            soundIndex: 0,
            portraitSuffix: "_happy"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "The ||Gohma||0 100 0|| sense four of them around the area, we should pick one to go after so we can set up a nice new hive!",
            soundIndex: 0,
            portraitSuffix: "_happy"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(15000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "||Akazoo||255 0 0|| seems to have placed the first one in ||Malkariko's Garden||255 255 0||. ",
            soundIndex: 0,
            portraitSuffix: "_neutral"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(25000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "There is a very large design flaw in the city's ||Marketplace||255 255 0||, we could storm through there to get to the Garden nest.",
            soundIndex: 0,
            portraitSuffix: "_happy"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(40000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Or we could seek out a nest along the ||outskirts of the city||255 255 0||.",
            soundIndex: 0,
            portraitSuffix: "_neutral"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(44000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "This one will be the easiest to take, but it's very exposed to a counterattack.",
            soundIndex: 0,
            portraitSuffix: "_neutral"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(48000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Or perhaps we could dig up the one in the ||Residential District||255 255 0||.",
            soundIndex: 0,
            portraitSuffix: "_neutral"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(52000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Taking this nest will cut off much of the city's housing and prevent them fielding large armies to counterattack us.",
            soundIndex: 0,
            portraitSuffix: "_happy"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(56000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Finally, we could go after the nest in the ||Military District||255 255 0|| first. There's a lot of defenses here and it would be the hardest to take,",
            soundIndex: 0,
            portraitSuffix: "_sad"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(63000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "but it would cut off the city's ability to train all their best soldiers!",
            soundIndex: 0,
            portraitSuffix: "_happy"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(70000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "The choice is up to you, the ||Gohma||0 100 0|| are ready and at your command.",
            soundIndex: 0,
            portraitSuffix: "_victorious"
        }));
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(76000, "CloseDialogueWindow", {})); // end of intro cutscene, close dialog
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(76000, "HideSkipButton", {})); // reset skip button to hidden if it wasnt pressed
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(76000, "PlayMusic", { tracks: "gohma_ambient1.ogg", resetDelay: 110000 }));

    for (let ent of this.introVisions)
        this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(76000, "DestroyEnt", ent));

    // play some dialogue with army screeches shorly after intro
    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(78000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Go forth my ||Gohma||0 100 0|| minions, let's not keep our ||Hylian||138 43 226|| friends waiting. ",
            soundIndex: 0,
            portraitSuffix: "_victorious"
        }));

    let delay = 25;
    for (let i = 0; i < this.playerArmy.length; i++)
    {
        this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(delay + 79000, "PlayUnitSound", { entity: this.playerArmy[i], name: "order_attack" }));
        delay += 25;
    }

    this.CutsceneDialogs.push(cmpTrigger.DoAfterDelay(87000, "CloseDialogueWindow", {}));
}

//////////////////////////////////////////////////////
// covers the tutorial after capturing the first hive
//////////////////////////////////////////////////////
Trigger.prototype.Tutorial1 = function ()
{
    this.InTutorial = true;

    this.UpdateList(this.allBuildings);
    for (let building of this.allBuildings)
        this.SetInvulnerability(building, true); // make the enemy buildings invulnerable, the player shouldnt be able to use the tutorial to advance the mission

    this.TutorialStep += 1;
    cmpTrigger.RegisterTrigger("OnStructureBuilt", "StructureBuiltAction", { "enabled": true });
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Oh goodie we did it! A brand new ||Hive||255 0 0|| and a Queen to make more Gohma!",
            soundIndex: 0,
            portraitSuffix: "_victorious",           
        }));
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "First things first, we need to lay some eggs and grow some ||Harvesters.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",            
        }));
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Select the new ||Gohma Queen||255 0 0|| and order her to lay a new egg near the Hive! ",
            soundIndex: 0,
            portraitSuffix: "_neutral",            
        }));
}

Trigger.prototype.Tutorial2 = function ()
{
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Goodie! Now select the little egg she just laid and have it hatch into a ||Harvester.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        }));  
}

Trigger.prototype.Tutorial3 = function ()
{
    cmpTrigger.EnableTrigger("OnPlayerCommand", "PlayerCommandAction");
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Very good! Look at the happy little ||Harvester.||255 0 0||, he's ready to get some food and wood for the Hive!",
            soundIndex: 0,
            portraitSuffix: "_happy",            
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Select the ||Harvester||255 0 0|| and order her to gather some food from the nearby ||Berries||255 0 0|| or ||Grain Fields||255 255 0||.",
            soundIndex: 0,
            portraitSuffix: "_neutral",         
        }));  
}

Trigger.prototype.Tutorial4 = function ()
{
    cmpTrigger.DisableTrigger("OnPlayerCommand", "PlayerCommandAction");
    cmpTrigger.tutorialObjectiveNumber = 0; // use this to keep track of the number of harvesters created
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "The ||Harvester.||255 0 0|| will go up to the food source and try to get as many resources as she can to bring back to the Hive.",
            soundIndex: 0,
            portraitSuffix: "_happy",      
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Now select the ||Gohma Queen||0 100 0||, have her lay ||Five||255 0 0|| more eggs, and turn them all into ||Harvesters.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",      
        }));  
}

Trigger.prototype.Tutorial5 = function ()
{  
    cmpTrigger.EnableTrigger("OnPlayerCommand", "PlayerCommandAction");
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "This is very good! More ||Harvesters||255 0 0|| means more stuff for the ||Gohma||0 100 0|| to eat and build with.",
            soundIndex: 0,
            portraitSuffix: "_happy",          
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "There should be some ||Trees||255 255 0|| near the Hive, have some of your ||Harvesters||255 0 0|| gather them and the rest help out with the food supply!",
            soundIndex: 0,
            portraitSuffix: "_neutral",            
        }));  
}

Trigger.prototype.Tutorial6 = function ()
{
    cmpTrigger.DisableTrigger("OnPlayerCommand", "PlayerCommandAction");
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "We'll also need some ||Ore||255 0 0|| and ||Rupees||0 255 0||, but it doesnt look like there's any nearby. ",
            soundIndex: 0,
            portraitSuffix: "_sad",          
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "We might be able to find some deeper in the ||City of Malkariko||255 255 0||, but it's pretty dangerous with so few Gohma. ",
            soundIndex: 0,
            portraitSuffix: "_neutral", 
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "I know, let's make a ||Recycler!||0 100 0|| This handy Gohma Building can transform what it eats into other resources! ",
            soundIndex: 0,
            portraitSuffix: "_happy", 
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(18000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "You will need a ||Hive Keeper||0 100 0|| in order to build Gohma buildings... to get one, let's have the Queen lay another egg. ",
            soundIndex: 0,
            portraitSuffix: "_neutral",         
        }));  
}

Trigger.prototype.Tutorial7 = function ()
{   
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Good, now select the egg and have it hatch into a ||Hive Larva.||0 100 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "The ||Hive Larva||0 100 0|| can grow into a bunch of different Gohma that are all geared for taking care of the Gohma Hives.",
            soundIndex: 0,
            portraitSuffix: "_neutral",            
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Select the ||Hive Larva||0 100 0|| and have him grow up into a ||Hive Keeper.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        }));  
}

Trigger.prototype.Tutorial8 = function ()
{
    cmpTrigger.EnableTrigger("OnPlayerCommand", "PlayerCommandAction");
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Oh they grow up so fast! That ||Hive Keeper||0 100 0|| is ready to make some new Gohma Buildings!",
            soundIndex: 0,
            portraitSuffix: "_happy",            
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Select the ||Hive Keeper||0 100 0|| and have him create a ||Recycler||255 0 0|| near your Hive.",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        }));  
}

Trigger.prototype.Tutorial9 = function ()
{
    cmpTrigger.DisableTrigger("OnPlayerCommand", "PlayerCommandAction");
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "You must have noticed that the ||Colored Ring||0 100 0|| around the Hive is quite small.",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "That is because Gohma buildings can't spread out too far and have to be near a ||Hive Core||0 100 0|| or ||Hive Node||0 100 0||.",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        }));  
}

Trigger.prototype.Tutorial10 = function ()
{
    this.tutorialObjectiveNumber = 0; // reset the number here for the soldier larva count
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Now that the Recycler is done, you can click on it and transform either ||Food||255 255 0|| or ||Materials||0 150 75|| into ||Ore||255 0 0|| or ||Rupees||0 255 0||, or vice versa!",
            soundIndex: 0,
            portraitSuffix: "_happy",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "As long as you have one ||Resource||255 255 0|| you can transform it into any other!",
            soundIndex: 0,
            portraitSuffix: "_happy",            
        })); 
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "If you are running low on Ore or Rupees, just have the ||Recycler||0 100 0|| turn your extra food or Material into them.",
            soundIndex: 0,
            portraitSuffix: "_neutral",          
        }));
    
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(18000, "CloseDialogueWindow", {}));
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(20000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Ok, now that we got a nice little economy going you are going to need a much larger army to take ||Malkariko Castle.||255 255 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",           
        })); 
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(26000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Have the ||Gohma Queen||0 100 0|| lay ten eggs and transform them all into ||Soldier Larva.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",        
        })); 
}

Trigger.prototype.Tutorial11 = function ()
{
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Very good, that's a nice little pack of ||Soldier Larva||0 100 0|| ready to bite!",
            soundIndex: 0,
            portraitSuffix: "_happy",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "||Soldier Larva||0 100 0|| are very small and very weak, but a very large swarm of them can take on even the largest of monsters!",
            soundIndex: 0,
            portraitSuffix: "_neutral",            
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Even better, they can grow up into even larger ||Combat Forms!||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_happy",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(18000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "To demonstrate this, select a ||Soldier Larva||0 100 0|| and have him transform into a ||Pincergohma.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",            
        }));  
}

Trigger.prototype.Tutorial12 = function ()
{
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "All right look at him and all those claws! He's ready to go!",
            soundIndex: 0,
            portraitSuffix: "_happy",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(10000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Having all these soldiers is nice and all, but you are going to need some reaaalllllyyyy large ||Gohma||0 100 0|| if you want to knock down all those walls in the way of the ||Castle.||255 255 0||",
            soundIndex: 0,
            portraitSuffix: "_annoyed",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(18000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Have your Queen lay a new egg and hatch it into a ||Giant Larva.||0 100 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",          
        }));  
}

Trigger.prototype.Tutorial13 = function ()
{
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Very nice, this big boy is a bit slow and clumsy but he's hardy and has a nasty bite!",
            soundIndex: 0,
            portraitSuffix: "_happy",           
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Most importantly, he can turn into huuuuuugggeee ||Gohma Forms!||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_victorious",          
        }));  
    this.TutorialDialogs.push(cmpTrigger.DoAfterDelay(12000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Select the ||Giant Larva||0 100 0|| and have him transform into a ||Tank Gohma.||255 0 0||",
            soundIndex: 0,
            portraitSuffix: "_neutral",        
        }));
}

Trigger.prototype.Tutorial14 = function ()
{
    this.InTutorial = false; // last tutorial dialogue, no more tutorial objectives will follow

    this.UpdateList(this.allBuildings);
    for (let building of this.allBuildings)
        this.SetInvulnerability(building, false); // tutorial is over, reset building vulnerability
    this.HylianDefence(); // activate hylian defense mechanism script

    cmpTrigger.DoAfterDelay(100, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "That's wonderful! Look at that giant guy, he's ready to go rip some walls apart! The force of its attacks will also ||Knock||255 0 0|| enemies back!",
            soundIndex: 0,
            portraitSuffix: "_happy",           
        });  
    cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Now that you know the basics, you can probably figure out how to make a larger army.",
            soundIndex: 0,
            portraitSuffix: "_neutral",          
        });  
    cmpTrigger.DoAfterDelay(18000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Try making some of the other Gohma buildings to see what they do, like the ||Hive Cell||0 100 0|| to increase your population size or the ||Hive Node||0 100 0|| to extend the reach of your base.",
            soundIndex: 0,
            portraitSuffix: "_neutral",      
        });  
    cmpTrigger.DoAfterDelay(30000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "When you think you have a large enough army, you can look for the other ||Three Hives||255 0 0|| or go directly after ||Malkariko Castle||255 255 0||, whatever you feel is best!",
            soundIndex: 0,
            portraitSuffix: "_happy",            
        });  
    cmpTrigger.DoAfterDelay(40000, "CloseDialogueWindow", {});
}

// when the skip button inside cutscene is pressed
Trigger.prototype.SkipPressed = function ()
{
    for (let id of this.CutsceneDialogs)
    {
        cmpTimer.CancelTimer(id); // cancel all cutscene dialog timers
    }
    this.CutsceneDialogs = [];   
}

// plays after the intro is skipped
Trigger.prototype.AfterIntro1 = function ()
{
    this.PlayMusic({ "tracks": "gohma_ambient1.ogg", resetDelay: 110000 })
    for (let ent of this.introVisions)
        this.DestroyEnt(ent);

    // play some dialogue with army screeches shorly after intro
    this.DialogueWindow(
        {
            character: "Agitha",
            dialogue: "Go forth my ||Gohma||0 100 0|| minions, let's not keep our ||Hylian||138 43 226|| friends waiting. ",
            soundIndex: 0,
            portraitSuffix: "_victorious"
        });

    let delay = 25;
    for (let i = 0; i < this.playerArmy.length; i++) {
        cmpTrigger.DoAfterDelay(delay + 1000, "PlayUnitSound", { entity: this.playerArmy[i], name: "order_attack" });
        delay += 25;
    }

    cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
}

Trigger.prototype.NextTutorial = function () // start the next tutorial section
{
    this.ClearTutorialDialogue(); // clear the dialog first before moving to the next tutorial section
    this["Tutorial" + (this.TutorialStep + 1)](); // call the function related to the next step 
    this.TutorialStep += 1; // increment step after call
}

Trigger.prototype.ClearTutorialDialogue = function () // clear tutorial dialog
{
    for (let id of this.TutorialDialogs)
    {
        cmpTimer.CancelTimer(id); // cancel all tutorial dialog timers for this step
    }
    this.TutorialDialogs = []; // all timers are cancelled, reset list
}

Trigger.prototype.DialogueWindow = function (data) // push dialogue with sound and imagery to the window
{
    cmpGUIInterface.PushNotification({
        "type": "campaign",
        "players": [1],
        "character": data.character,
        "dialogue": data.dialogue,
        "soundIndex": data.soundIndex, // represents the index of the played character sound ( -1 = no sound, 0 = random sound of the total, 1-x = specific sound with that index)
        "portraitSuffix": data.portraitSuffix // _annoyed, _angry, _defeated, _neutral, _sad, _victorious, _happy
    });
};

Trigger.prototype.CampaignEndUI = function (data) // push dialogue with sound and imagery to the window
{
    cmpGUIInterface.PushNotification({
        "type": "campaignEnd",
        "players": [1],
        "image": data.image
    });
};

Trigger.prototype.PlayUISound = function (path)
{
    cmpGUIInterface.PushNotification({
        "type": "UISound",
        "players": [1],
        "path": path, // the path of the audio file
    });
}

Trigger.prototype.ActivateSkipButton = function (data)
{
    cmpGUIInterface.PushNotification({
        "type": "campaignSkipSetup",
        "players": [1],
        "function": data.function, // the function called when skip is pressed
        "delay": data.delay // the delay of the function call
    });
}

Trigger.prototype.HideSkipButton = function ()
{
    cmpGUIInterface.PushNotification({
        "type": "campaignSkipSetup",
        "players": [1],
        "hide": true,
    });
}

Trigger.prototype.CloseDialogueWindow = function ()
{
    cmpGUIInterface.PushNotification({
        "type": "campaign",
        "players": [1],
        "hide": true,
    });
}

Trigger.prototype.SendCinematicRequest = function (data)
{
    cmpGUIInterface.PushNotification({
        "type": "cinematic",
        "players": [1],
        "dialogue": data.dialogue, // the message being sent
        "url": data.url // the web url of the cinematic
    });
}

Trigger.prototype.SendGenericRequest = function (data)
{
    cmpGUIInterface.PushNotification({
        "type": "genericCampaign",
        "players": [1],
        "dialogue": data.dialogue, // the message being sent
        "functionTrue": data.functionTrue, // which function to call when yes was pressed
        "functionFalse": data.functionFalse, // which function to call when no was pressed
        "delay": data.delay
    });
}

Trigger.prototype.EntityDeathAction = function (data) // when an entity dies
{
    let entity = data.entity;

    if (entity == this.Agitha || entity == this.Mido) // mission is lost if mido or agitha is slain
    {
        this.PlayMusic({ tracks: "gohma_defeat1.ogg", resetDelay: 0 }); // play defeat music
        if (entity == this.Agitha)
        {
            this.DialogueWindow(
                {
                    character: "Mido",
                    dialogue: "OH NO..., ||Agitha!||0 100 0|| What should I do..., RETREAT! Everyone fall back! ",
                    soundIndex: 1,
                    portraitSuffix: "_defeated"
                });
        }
        else
        {
            this.DialogueWindow(
                {
                    character: "Agitha",
                    dialogue: "Oh no..., poor ||Mido||0 100 0|| has fallen. Fall back little ones, we will have to fight another day. ",
                    soundIndex: 1,
                    portraitSuffix: "_defeated"
                });
        }

        cmpTrigger.DoAfterDelay(1000, "DefeatPlayer", {});
        cmpTrigger.DisableTrigger("OnEntityDeath", "EntityDeathAction"); // dont repeat this again
    }

    if (this.ControlledHives.length > 0)
    {
        if (entity == this.ControlledHives[0].newID) // if the first base is destroyed, the mission is lost
        {
            this.PlayMusic({ tracks: "gohma_defeat1.ogg", resetDelay: 0 }); // play defeat music
            this.DialogueWindow(
                {
                    character: "Agitha",
                    dialogue: "Oh no..., our beautiful ||Gohma Base||0 100 0||... gone, Fall back little ones, we will have to fight another day.",
                    soundIndex: 1,
                    portraitSuffix: "_defeated"
                });

            cmpTrigger.DoAfterDelay(1000, "DefeatPlayer", {});
            cmpTrigger.DisableTrigger("OnEntityDeath", "EntityDeathAction"); // dont repeat this again
            return; // mission is lost, no need to check for new targets
        }

        for (let hive of this.ControlledHives)
        {
            if (entity == hive.newID) // if the destroyed entity is a hive, give new attack orders to the spawned hylians
            {
                let hivePos = Engine.QueryInterface(this.ControlledHives[0].newID, IID_Position).GetPosition2D(); // get first hive pos
                this.AttackCommand(hivePos.x, hivePos.y, this.spawnedArmy, 3, false); // attack that position
                if (this.hylianDefenceTimer == -1)
                    this.AttackCommand(hivePos.x, hivePos.y, [this.Impa], 2, false); // if the hylian defence was halted, impa is among the attack group so give her another command as well
            }
        }
    }

    for (let ent of this.housingGuards) // triggered when any of the housing district militia are killed
    {
        if (entity == ent)
            this.HousingEntryTrigger();
    }

    for (let ent of this.gardenGuards) // triggered when any of the garden district bridge guards are killed
    {
        if (entity == ent)
            this.GardenEntryTrigger();            
    }
}

Trigger.prototype.UpgradeFinishedAction = function (data)
{
    if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().endsWith("Core")) // check if the upgraded entity is a hive core
    {
        this.ControlledHives.push({ newID: data.newEntity, oldID: data.oldEntity }); // increment number of hives
        this.HiveTriggered({ newID: data.newEntity, oldID: data.oldEntity }); // call the functionality for the triggered hive

        let oldEntity = data.oldEntity;
        for (let i = 0; i < this.Nests.length; i++)
        {
            if (this.Nests[i] == oldEntity)
            {
                this.Nests.splice(i, 1);
                break;
            }
        }
    }

    if (!this.InTutorial)
        return;

    switch (this.TutorialStep)
    {
        case 2:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().startsWith("Harv"))
                this.NextTutorial();
            break;
        case 4:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().startsWith("Harv"))
            {
                this.tutorialObjectiveNumber += 1;
                if (this.tutorialObjectiveNumber >= 5)
                    this.NextTutorial();
            }
            break;
        case 7:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().endsWith("Keeper"))
                this.NextTutorial();
            break;
        case 10:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().startsWith("Soldier"))
            {
                this.tutorialObjectiveNumber += 1;
                if (this.tutorialObjectiveNumber >= 10)
                    this.NextTutorial();
            }
        case 11:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().startsWith("Pincer"))
                this.NextTutorial();
        case 12:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName() == "Giant Larva")
                this.NextTutorial();
        case 13:
            if (Engine.QueryInterface(data.newEntity, IID_Identity).GetSpecificName().startsWith("Tank"))
                this.NextTutorial();
        default:
            break;
    }
};

Trigger.prototype.StructureBuiltAction = function (data)
{
    if (!this.InTutorial)
        return;

    switch (this.TutorialStep) {
        case 1:
            if (Engine.QueryInterface(data.building, IID_Identity).GetSpecificName().endsWith("Egg"))
                this.NextTutorial();
            break;
        case 6:
            if (Engine.QueryInterface(data.building, IID_Identity).GetSpecificName().endsWith("Egg"))
                this.NextTutorial();
            break;
        case 9:
            if (Engine.QueryInterface(data.building, IID_Identity).GetSpecificName() == "Recycler")
                this.NextTutorial();
            break;
        default:
            break;
    }   
}

Trigger.prototype.PlayerCommandAction = function (data)
{
    //error(uneval(data));

    if (data.cmd.type.endsWith("YesNo")) // receives the result of a generic request 
    {
        if (data.cmd.function != "") // if there is a function that requires calling after the result
            cmpTrigger.DoAfterDelay(data.cmd.delay, data.cmd.function, {});
        cmpTrigger.DisableTrigger("OnPlayerCommand", "PlayerCommandAction"); // disable trigger for performance
    }

    if (data.cmd.type.endsWith("Camera"))
    {
        this.SkipPressed();
        if (data.cmd.function != "") // if there is a function that requires calling after the result
            cmpTrigger.DoAfterDelay(data.cmd.delay, data.cmd.function, {});
        cmpTrigger.DisableTrigger("OnPlayerCommand", "PlayerCommandAction"); // disable trigger for performance
    }

    if (!this.InTutorial)
        return;

    switch (this.TutorialStep)
    {
        case 3:
            if (data.cmd.type == "gather" && data.cmd.target && TriggerHelper.GetResourceType(data.cmd.target).generic == "food")
                this.NextTutorial();
            break;
        case 5:
            if (data.cmd.type == "gather" && data.cmd.target && TriggerHelper.GetResourceType(data.cmd.target).generic == "wood")
                this.NextTutorial();
            break;
        case 8:
            if (data.cmd.type == "construct" && data.cmd.template && data.cmd.template.endsWith("market"))
                this.NextTutorial();
            break;
        default:
            break;
    }
}

Trigger.prototype.HealthChangedAction = function (data)
{
    if (data.entity == this.Impa)
    {
        if (data.HP < 250) // if Impa is beneath 250 HP, flee back to original location
        {
            let cmpHealth = Engine.QueryInterface(this.Impa, IID_Health);
            cmpHealth.SetHitpoints(cmpHealth.GetMaxHitpoints()); // set HP back to full
            let cmpArmour = Engine.QueryInterface(this.Impa, IID_DamageReceiver);
            this.SetInvulnerability(this.Impa, true); // set invulnerability 
            if (cmpArmour.isStunned == true) // if impa is still stunned, reset her state first before giving the other movement commands
            {
                cmpTimer.CancelTimer(cmpArmour.stunData.timer); // cancel the current reset timer
                cmpArmour.ResetStun(cmpArmour.stunData); // and call it manually instead
            }

            if (this.impaFinalRetreat == undefined) // if Impa is in assaulting mode
            {
                this.DoAfterDelay(500, "SetUnitFlee", { x: this.ImpaStartLocation.x, z: this.ImpaStartLocation.z, entities: [this.Impa], playerID: 2, queue: false }); // flee to location for dramatic effect
                this.DialogueWindow(
                    {
                        character: "Impa",
                        dialogue: "Damn these pesky ||Gohma||0 100 0||, I will repay this debt later.",
                        soundIndex: 0,
                        portraitSuffix: "_annoyed"
                    });

                this.DoAfterDelay(20000, "ImpaReset", {}); // reset impa back to her original location after fleeing for X seconds
                cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
            }
            else // if all hives have been captured, the Hylians will resort to defending the keep area, if Impa is defeated here she will retreat to the castle
            {               
                this.DoAfterDelay(500, "SetUnitFlee", { x: 1053, z: 1279, entities: [this.Impa], playerID: 2, queue: false }); // flee to the castle and delete there 
                this.RemoveAtFleeLocation({ list: [this.Impa], x: 1053, z: 1279, threshold: 7 }); // remove impa when she is at the gate
                cmpTimer.CancelTimer(this.hylianDefenceTimer); // last defence, no more unit spawns
                this.DialogueWindow(
                    {
                        character: "Impa",
                        dialogue: "Defeat is inevitable, our only hope is to hold out inside ||Malkariko Castle||255 255 0|| as long as we can.",
                        soundIndex: 0,
                        portraitSuffix: "_sad"
                    });
                cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});
            }

            if (this.hylianDefenceTimer == -1)
                this.DoAfterDelay(this.timeBetweenSpawns, "HylianDefence", {}); // reset hylian defence script if it was forcibly disabled by other attacking scripts
        }
    }
    if (data.entity == this.Castle) // castle captured, end the mission with cutscene and victory screen
    {
        if (data.HP < 500) // if the castle is beneath 500 HP, the gohma have claimed victory
        {
            this.campaignEnd = true;
            if (!Engine.QueryInterface(this.Impa, IID_Health)) 
                this.DestroyEnt(this.Impa); // make sure to delete Impa if she somehow still exists at this point

            cmpTrigger.DisableTrigger("OnHealthChanged", "HealthChangedAction");
            cmpCinemaManager.DeletePath("IntroA");
            cmpCinemaManager.DeletePath("IntroB");
            cmpCinemaManager.DeletePath("IntroC");
            cmpCinemaManager.DeletePath("IntroD");
            cmpCinemaManager.DeletePath("IntroE");
            cmpCinemaManager.AddCinemaPathToQueue("EndA");
            cmpCinemaManager.Play(); // play the outro

            this.UpdateList(this.castleUnits);
            for (let unit of this.castleUnits)
                Engine.QueryInterface(unit, IID_Health).Kill(); // kill the garrisoned units inside the Malkariko castle if they arent dead yet

            this.UpdateList(this.spawnedArmy);
            for (let unit of this.spawnedArmy)
                Engine.QueryInterface(unit, IID_Health).Kill(); // kill the spawned units as well

            if (this.hylianDefenceTimer != 0)
                cmpTimer.CancelTimer(this.hylianDefenceTimer); // last defence, no more unit spawns

            this.SpawnVision({ x: 1097, z: 1355, resetDelay: 0, owner: 1, size: "large" }); // spawn vision on the castle during cutscene
            this.SpawnVision({ x: 1053, z: 1279, resetDelay: 0, owner: 1, size: "large" }); // spawn vision on the castle during cutscene

            cmpTrigger.DoAfterDelay(200, "RevealMap", { state: false }); // unreveal map          

            let list = TriggerHelper.GetPlayerEntitiesByClass(1, "Gohma"); // grab both the current gohma and the AI gohma
            let list2 = TriggerHelper.GetPlayerEntitiesByClass(4, "Gohma");

            this.SetUnitFlee({ x: 1053, z: 1279, entities: list, playerID: 1, queue: false }); // units run toward the gate location
            this.RemoveAtFleeLocation({ list: list, x: 1053, z: 1279, threshold: 8 }); // and disappear there to give the indication they are entering the castle

            this.SetUnitFlee({ x: 1053, z: 1279, entities: list2, playerID: 4, queue: false });
            this.RemoveAtFleeLocation({ list: list2, x: 1053, z: 1279, threshold: 8 }); 

            cmpTrigger.DoAfterDelay(3000, "DialogueWindow",
                {
                    character: "Mido",
                    dialogue: "The ||Castle Gates||255 255 0|| have been breached ||Agitha!||255 0 0|| Mostly because of me of course. ",
                    soundIndex: 1,
                    portraitSuffix: "_victorious"
                });

            cmpTrigger.DoAfterDelay(9000, "DialogueWindow",
                {
                    character: "Agitha",
                    dialogue: "||Sulkaris||255 0 0|| will be most pleased, so kind of the silly ||Hylians||138 43 226|| to offer themselves to the ||Gohma Swarm.||0 100 0||",
                    soundIndex: 1,
                    portraitSuffix: "_victorious"
                });

            cmpTrigger.DoAfterDelay(17000, "CloseDialogueWindow", {}); // stop dialogue
            cmpTrigger.DoAfterDelay(17000, "StopCinematicCamera", {}); // stop the camera manually
            cmpTrigger.DoAfterDelay(17500, "SendCinematicRequest", // send the final cinematic request before the victory screen
                {
                    dialogue: "Would you like to see the outro cinematic affiliated with this mission?\n\n\n " +
                        "NOTE: There is currently no video support available. Therefore, a web url will be opened that contains this cinematic with the game paused automagically.\n " +
                        "When the cinematic is finished, you can resume playing the game manually by pressing the resume game button.",
                    url: "https://youtu.be/g5CyYX5Y2lg"
                }
            );

            cmpTrigger.DoAfterDelay(18000, "VictoryPlayer", {}); // set the final victory screen
        }
    }
}

Trigger.prototype.ImpaReset = function ()
{
    let cmpPos = Engine.QueryInterface(this.Impa, IID_Position);
    Engine.QueryInterface(this.Impa, IID_UnitAI).StopMoving(); // stop motion first
    cmpPos.JumpTo(this.ImpaStartLocation.x, this.ImpaStartLocation.z); // jump to location
    cmpPos.SetYRotation(this.ImpaStartLocation.rot); // and set correct rotation
    this.SetInvulnerability(this.Impa, false); // reset invulnerability 
    let cmpUnitAI = Engine.QueryInterface(this.Impa, IID_UnitAI);
    cmpUnitAI.SetMoveSpeed(cmpUnitAI.GetWalkSpeed()); // reset movement speed
    cmpUnitAI.StopMoving();
    this.SetAIStance("aggressive", [this.Impa], 2); // set a stance after jump
}

// receives incoming data from gohma units entering malkariko castle
Trigger.prototype.RangeMalkarikoCastle = function (data)
{
    if (data.currentCollection.length < 1)
        return;

    cmpTrigger.impaFinalRetreat = true;
    cmpTrigger.EnableTrigger("OnHealthChanged", "HealthChangedAction"); // if no hive is captured and the gohma get close, activate the health trigger
    cmpTrigger.DisableTrigger("OnRange", "RangeMalkarikoCastle");
}

Trigger.prototype.RangeMarketBridge = function (data)
{
    if (data.currentCollection.length < 10)
        return;

    this.DialogueWindow(
        {
            character: "Hylian Knight",
            dialogue: "Hold them back until the citizens have evacuated! For the ||Kingdom of Hyrule!||138 43 226||",
            soundIndex: 3,
            portraitSuffix: "_neutral"                                 
        });

    this.UpdateList(this.marketUnits);
    let delay = 25;
    for (let i = 0; i < this.marketUnits.length; i++)
    {
        cmpTrigger.DoAfterDelay(delay + 1000, "PlayUnitSound", { entity: this.marketUnits[i], name: "order_attack" }); // cheering/yelling for defenders
        delay += 25;
    }

    cmpTrigger.DoAfterDelay(6000, "DialogueWindow",
        {
            character: "Impa",
            dialogue: "||The Gohma Swarm||0 100 0|| is trying to cross the bridge near the ||Market Square!||255 255 0|| Do not let them through!",
            soundIndex: 0,
            portraitSuffix: "_angry"
        });

    cmpTrigger.DoAfterDelay(12000, "CloseDialogueWindow", {});
    this.CheckRangeMarketBridge({ collection: this.marketUnits, fleeToGarden: true, fleeToMilitary: true });
    cmpTrigger.DisableTrigger("OnRange", "RangeMarketBridge");
}

Trigger.prototype.CheckRangeMarketBridge = function (data)
{
    this.UpdateList(data.collection); // update squad list
    if (data.collection.length <= 14) // if the defending squad is down to 14(taking the crossbowmen into account), execute fleeing section
    {
        this.UpdateList(this.citizenGroupMarket);

        //error(uneval(data));
        let delay = 100;
        if (data.fleeToGarden == true && data.fleeToMilitary == true) {
            let count = 0;
            for (let citizen of this.citizenGroupMarket) // small delay in the fleeing, since there are so many citizens in this list to make it look it slightly more dynamic
            {
                if (count % 2 == 1) // every other citizen will flee to the military district and the garden
                    cmpTrigger.DoAfterDelay(delay, "SetUnitFlee", { x: 1350, z: 946, entities: [citizen], playerID: 3, queue: false });
                else
                    cmpTrigger.DoAfterDelay(delay, "SetUnitFlee", { x: 814, z: 851, entities: [citizen], playerID: 3, queue: false });
                delay += 100;
                count += 1;
            }

            this.RemoveAtFleeLocation({ list: this.citizenGroupMarket, x: 1350, z: 946, threshold: 10 }); // delete the citizens when they have reached their destination
            this.RemoveAtFleeLocation({ list: this.citizenGroupMarket, x: 814, z: 851, threshold: 10 });
        }
        else if (data.fleeToGarden == true && data.fleeToMilitary == false) {
            for (let citizen of this.citizenGroupMarket) // small delay in the fleeing, since there are so many citizens in this list to make it look it slightly more dynamic
            {
                cmpTrigger.DoAfterDelay(delay, "SetUnitFlee", { x: 1350, z: 946, entities: [citizen], playerID: 3, queue: false });
                delay += 100;
            }
            this.RemoveAtFleeLocation({ list: this.citizenGroupMarket, x: 1350, z: 946, threshold: 10 }); // delete the citizens when they have reached their destination
        }
        else {
            for (let citizen of this.citizenGroupMarket) // small delay in the fleeing, since there are so many citizens in this list to make it look it slightly more dynamic
            {
                cmpTrigger.DoAfterDelay(delay, "SetUnitFlee", { x: 814, z: 851, entities: [citizen], playerID: 3, queue: false });
                delay += 100;
            }
            this.RemoveAtFleeLocation({ list: this.citizenGroupMarket, x: 814, z: 851, threshold: 10 });
        }

        cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "Haha, watch them flee in fear ||Agitha!||255 0 0||, ||The Market District||255 255 0|| is ours! ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 931, z: 749, resetDelay: 20000, owner: 1, size: "medium" }); // spawn vision on the fleeing Hylians
        cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 1171, z: 788, resetDelay: 20000, owner: 1, size: "medium" });

        cmpTrigger.DoAfterDelay(8000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Yes ||Mido||255 0 0||, it seems they finally understand that the ||Gohma's||0 100 0|| strength exceeds their pitiful society.",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(16000, "CloseDialogueWindow", {});
    }
    else
        cmpTrigger.DoAfterDelay(1000, "CheckRangeMarketBridge", data); // recheck if threshold of depletion hasnt been reached yet
}

Trigger.prototype.RangeNestFarm = function (data) {
    if (data.currentCollection.length > 0)
    {
        this.NestVicinityDialogue("||Outskirt Farm");
        cmpTrigger.DisableTrigger("OnRange", "RangeNestFarm");
    }
}

Trigger.prototype.RangeNestMilitary = function (data) {
    if (data.currentCollection.length > 0) {
        this.NestVicinityDialogue("||Military District");
        cmpTrigger.DisableTrigger("OnRange", "RangeNestMilitary");
    }
}

Trigger.prototype.RangeNestGarden = function (data) {
    if (data.currentCollection.length > 0)
    {
        this.NestVicinityDialogue("||Garden District");
        cmpTrigger.DisableTrigger("OnRange", "RangeNestGarden");
    }
}

Trigger.prototype.RangeNestHousing = function (data) { 
    if (data.currentCollection.length > 0)
    {
        this.NestVicinityDialogue("||Housing District");
        cmpTrigger.DisableTrigger("OnRange", "RangeNestHousing");
    }
}

// called when the gohma have killed one of the housing guards
Trigger.prototype.HousingEntryTrigger = function ()
{
    this.UpdateList(this.housingGuards);
    this.SetUnitFlee({ x: 1266, z: 1200, entities: this.citizenGroupHousing, playerID: 3, queue: false }); // flee housing citizens to castle square for dramatic effect
    this.RemoveAtFleeLocation({ list: this.citizenGroupHousing, x: 1266, z: 1200, threshold: 10 }); // remove them at the flee location
    cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 1425, z: 1257, resetDelay: 30000, owner: 1, size: "medium" }); // spawn vision on the fleeing citizens

    cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
        {
            character: "Mido",
            dialogue: "Haha, watch them flee in fear ||Agitha!||255 0 0||, ||The Housing District||255 255 0|| is ours!",
            soundIndex: 0,
            portraitSuffix: "_happy"
        });

    cmpTrigger.DoAfterDelay(8000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Yes ||Mido||255 0 0||, the ||Gohma||0 100 0|| will swipe across ||Hyrule||138 43 226|| like a cleansing plague.",
            soundIndex: 0,
            portraitSuffix: "_happy"
        });

    cmpTrigger.DoAfterDelay(16000, "CloseDialogueWindow", {});
    this.housingGuards = []; // trigger is called, no longer need to use this array
}

// called when the gohma have killed one of the garden guards
Trigger.prototype.GardenEntryTrigger = function ()
{
    this.UpdateList(this.citizenGroupGarden);
    this.SetUnitFlee({ x: 1266, z: 1200, entities: this.citizenGroupGarden, playerID: 3, queue: false }); // flee garden citizens to castle square for dramatic effect
    this.RemoveAtFleeLocation({ list: this.citizenGroupGarden, x: 1266, z: 1200, threshold: 10 }); // remove them at the flee location

    this.UpdateList(this.marketUnits);
    if (this.marketUnits.length > 0)
    {
        this.AttackCommand(1331, 908, this.marketUnits, 2, false); // send market units to attack the garden if they still exist
        this.CheckRangeMarketBridge({ collection: this.marketUnits, fleeToGarden: false, fleeToMilitary: true }); // make sure to run the market unit checker
        cmpTrigger.DisableTrigger("OnRange", "RangeMarketBridge"); // and disable the market trigger
    }

    cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 1288, z: 1058, resetDelay: 20000, owner: 1, size: "medium" }); // spawn vision on the fleeing citizens

    cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
        {
            character: "Mido",
            dialogue: "Haha, watch them flee in fear ||Agitha!||255 0 0||, ||The Garden District||255 255 0|| is ours!",
            soundIndex: 0,
            portraitSuffix: "_happy"
        });

    cmpTrigger.DoAfterDelay(8000, "DialogueWindow",
        {
            character: "Agitha",
            dialogue: "Yes ||Mido||255 0 0||, the ||Gohma||0 100 0|| will swipe across ||Hyrule||138 43 226|| like a cleansing plague.",
            soundIndex: 0,
            portraitSuffix: "_happy"
        });

    cmpTrigger.DoAfterDelay(16000, "CloseDialogueWindow", {});
    this.gardenGuards = []; // trigger is called, no longer need to use this array
}

Trigger.prototype.RangeGateMilitary = function (data)
{
    if (data.currentCollection.length > 15)
    {
        let allUnits = TriggerHelper.SpawnUnits(5415, "units/hylian/malkariko_knightofhyrule_b", 10, 3); 
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(5415, "units/hylian/malkariko_crossbowman_b", 10, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(5415, "units/hylian/hylian_castle_guard_b", 10, 3));
        this.SetAIStance("defensive", allUnits, 3); // dont have the defenders chase the Gohma too far

        this.DialogueWindow(
            {
                character: "Hylian Knight",
                dialogue: "Get rid of these filthy Gohma intruders men! The ||Military District||255 255 0|| has to be defended!", // fate hangs in the balance
                soundIndex: 1,
                portraitSuffix: "_neutral"
            });

        let delay = 25;
        for (let i = 0; i < allUnits.length; i++) {
            cmpTrigger.DoAfterDelay(delay + 1000, "PlayUnitSound", { entity: allUnits[i], name: "order_attack" }); // cheering/yelling for defenders
            delay += 25;
        }

        cmpTrigger.DoAfterDelay(8000, "DialogueWindow",
            {
                character: "Impa",
                dialogue: "These ||Gohma||0 100 0|| actually believe they can breach our ||Military District||255 255 0||, such foolishness. ",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(16000, "CloseDialogueWindow", {});
        cmpTrigger.DisableTrigger("OnRange", "RangeGateMilitary");
    }
}

Trigger.prototype.RangeGateKeep = function (data) {
    if (data.currentCollection.length > 15)
    {
        let allUnits = TriggerHelper.SpawnUnits(1607, "units/hylian/hylian_knightofhyrule_b", 8, 2);
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(1607, "units/hylian/hylian_ironclad_b", 2, 2));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(1607, "units/hylian/hylian_castle_guard_b", 13, 2));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(1607, "units/hylian/hylian_flailknight_b", 8, 2));  
        this.SetAIStance("defensive", allUnits, 3); // dont have the defenders chase the Gohma too far

        cmpTrigger.EnableTrigger("OnHealthChanged", "HealthChangedAction"); // enable potential fleeing from Impa when wounded
        Engine.QueryInterface(this.Impa, IID_Position).JumpTo(880, 1278); // set Impa near the spawned units
        this.SetAIStance("defensive", [this.Impa], 2);
        this.WalkCommand(810, 1453, allUnits, 2, false); // defend that position 
        this.WalkCommand(810, 1453, [this.Impa], 2, false);

        this.DialogueWindow(
            {
                character: "Impa",
                dialogue: "||The Western Gate||255 255 0|| is under threat! The royal squad will follow me in its defence!",
                soundIndex: 0,
                portraitSuffix: "_angry"
            });

        cmpTrigger.DoAfterDelay(13000, "DialogueWindow",
            {
                character: "Impa",
                dialogue: "Let's give it a whirl boys! Put dem punks down!", // these Gohma wont know what hit them, Hylians, Attack!
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        let delay = 25;
        for (let i = 0; i < allUnits.length; i++) {
            cmpTrigger.DoAfterDelay(delay + 14000, "PlayUnitSound", { entity: allUnits[i], name: "order_attack" }); // cheering/yelling for defenders
            delay += 25;
        }

        cmpTrigger.DoAfterDelay(22000, "CloseDialogueWindow", {});
        cmpTrigger.DisableTrigger("OnRange", "RangeGateKeep");
    }
}

Trigger.prototype.RangeGateHousing = function (data)
{
    if (data.currentCollection.length > 15)
    {
        // spawn 2 squads at the opposing trees overlooking the gate
        let allUnits = TriggerHelper.SpawnUnits(8270, "units/hylian/malkariko_knightofhyrule_b", 1, 3);
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8270, "units/hylian/malkariko_crossbowman_b", 2, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8270, "units/hylian/hylian_town_lookout_b", 4, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8270, "units/hylian/malkariko_town_guard_b", 6, 3));
        
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8268, "units/hylian/malkariko_knightofhyrule_b", 1, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8268, "units/hylian/malkariko_crossbowman_b", 2, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8268, "units/hylian/hylian_town_lookout_b", 4, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(8268, "units/hylian/malkariko_town_guard_b", 6, 3));

        this.AttackCommand(1463, 1597, allUnits, 3, false); // ambush the Gohma

        cmpTrigger.DoAfterDelay(2000, "DialogueWindow",
            {
                character: "Hylian Knight",
                dialogue: "To arms, brave soldiers of ||Hyrule!||138 43 226|| Cast these foul creatures back into the abyss!",
                soundIndex: 3,
                portraitSuffix: "_neutral"
            });

        let delay = 25;
        for (let i = 0; i < allUnits.length; i++) {
            cmpTrigger.DoAfterDelay(delay + 3000, "PlayUnitSound", { entity: allUnits[i], name: "order_attack" }); // cheering/yelling for defenders
            delay += 25;
        }

        cmpTrigger.DoAfterDelay(10000, "CloseDialogueWindow", {});
        cmpTrigger.DisableTrigger("OnRange", "RangeGateHousing");
    }
}

Trigger.prototype.RangeGateWood = function (data)
{
    if (data.currentCollection.length > 15)
    {
        let allUnits = TriggerHelper.SpawnUnits(4559, "units/hylian/malkariko_town_guard_b", 12, 3); // spawn all units at the house behind the gate
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(4559, "units/hylian/malkariko_knightofhyrule_b", 2, 3));
        allUnits = allUnits.concat(TriggerHelper.SpawnUnits(4559, "units/hylian/hylian_town_lookout_b", 6, 3));

        let pos = Engine.QueryInterface(data.currentCollection[0], IID_Position).GetPosition2D(); // doesnt matter which unit in range is used for pos, so just pick index 0
        this.AttackCommand(pos.x, pos.y, allUnits, 3, false); // attack that position

        this.DialogueWindow(
            {
                character: "Hylian Knight",
                dialogue: "Get rid of these filthy Gohma intruders men! The ||Citizens of Malkariko||173 255 47|| depend on us!", // fate hangs in the balance
                soundIndex: 1,
                portraitSuffix: "_neutral"
            });

        let delay = 25;
        for (let i = 0; i < allUnits.length; i++) {
            cmpTrigger.DoAfterDelay(delay + 1000, "PlayUnitSound", { entity: allUnits[i], name: "order_attack" }); // cheering/yelling for defenders
            delay += 25;
        }

        cmpTrigger.DoAfterDelay(8000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "These silly ||Hylians||138 43 226|| are so full of themselves, they should just give up already. ",
                soundIndex: 0,
                portraitSuffix: "_annoyed"
            });

        cmpTrigger.DoAfterDelay(16000, "CloseDialogueWindow", {});
        this.CheckRangeGateWood(allUnits); // when these units are nearly depleted, the citizens flee

        cmpTrigger.DisableTrigger("OnRange", "RangeGateWood"); // trigger called, no longer necessary now so disable
    }
}

Trigger.prototype.CheckRangeGateWood = function (collection)
{
    this.UpdateList(collection); // update squad list
    if (collection.length <= 3) // if the defending squad is down to 3, execute fleeing section
    {
        this.UpdateList(this.citizenGroupVillage);
        this.UpdateList(this.citizenGroupVillage2);

        let delay = 100;
        for (let citizen of this.citizenGroupVillage) { // small delay in the fleeing, since there are so many citizens in this list to make it look it slightly more dynamic
            cmpTrigger.DoAfterDelay(delay, "SetUnitFlee", { x: 1350, z: 946, entities: [citizen], playerID: 3, queue: false });
            delay += 100;
        }

        this.RemoveAtFleeLocation({ list: this.citizenGroupVillage, x: 1350, z: 946, threshold: 10 }); // delete the citizens when they have reached their destination

        cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
            {
                character: "Mido",
                dialogue: "Haha, watch them flee in fear ||Agitha!||255 0 0||, these stupid ||Hylians||138 43 226|| lack bravery, unlike me.",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 1409, z: 337, resetDelay: 25000, owner: 1, size: "large" }); // spawn vision on the fleeing Hylians
        cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 1463, z: 604, resetDelay: 25000, owner: 1, size: "large" });
        cmpTrigger.DoAfterDelay(1000, "SpawnVision", { x: 1424, z: 725, resetDelay: 25000, owner: 1, size: "large" });

        cmpTrigger.DoAfterDelay(11000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Yes ||Mido||255 0 0||, it seems they finally understand that the ||Gohma's||0 100 0|| strength exceeds their pitiful society.",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        cmpTrigger.DoAfterDelay(10000, "SetUnitFlee", { x: 1600, z: 1030, entities: this.citizenGroupVillage2, playerID: 3, queue: false }); // send second citizen group to the housing district
        cmpTrigger.DoAfterDelay(10000, "RemoveAtFleeLocation", { list: this.citizenGroupVillage2, x: 1600, z: 1030, threshold: 10 }); // and delete them when they arrive
        cmpTrigger.DoAfterDelay(11000, "SpawnVision", { x: 1678, z: 728, resetDelay: 14000, owner: 1, size: "large" }); // dont forget some vision for the player so they can witness the fear of the Hylians :)
        cmpTrigger.DoAfterDelay(20000, "CloseDialogueWindow", {});
    }
    else
        cmpTrigger.DoAfterDelay(1000, "CheckRangeGateWood", collection); // recheck if threshold of depletion hasnt been reached yet
}

// add resources
Trigger.prototype.RangeSkulltulaA = function (data)
{
    if (data.currentCollection.length > 0)
    {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh lookie, its a ||Gold Skulltula||255 215 0||!",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        let allUnits = [];
        allUnits.push(this.SpawnUnit({ x: 181, z: 483, angle: 0, template: "gaia/fauna_spider_skulltula_gold", owner: 0 })); // gold skulltula
        let goldSkulltula = allUnits[0];

        // regular skulltula companion
        allUnits.push(this.SpawnUnit({ x: 171, z: 490, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 184, z: 490, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 182, z: 476, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));

        // skulltula babies
        allUnits.push(this.SpawnUnit({ x: 178, z: 492, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 189, z: 481, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 176, z: 479, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));

        let pos = Engine.QueryInterface(data.currentCollection[0], IID_Position).GetPosition2D();
        this.AttackCommand(pos.x, pos.y, allUnits, 0, false); // attack the intruder

        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});

        cmpTrigger.DisableTrigger("OnRange", "RangeSkulltulaA"); // skulltula batch spawned, disable trigger
        this.CheckSkulltulaA(goldSkulltula); // check when the skulltula dies
    }
}

Trigger.prototype.CheckSkulltulaA = function (skulltula)
{
    if (Engine.QueryInterface(skulltula, IID_Health) == undefined)
    {
        this.PlayUISound("audio/interface/alarm/alarmupgradearmory_1.ogg");
        cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Look at this shiny ||Gold Skulltula||255 215 0|| that we just got, it gave us some ||Metal||255 0 0|| and ||Food||0 255 0||!",
                soundIndex: 0,
                portraitSuffix: "_victorious"
            });

        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});

        let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
        cmpPlayer.AddResource("stone", 500); // add metal
        cmpPlayer.AddResource("food", 750); // add food
    }
    else
        cmpTrigger.DoAfterDelay(1000, "CheckSkulltulaA", skulltula); //recall when the gold skulltula is still alive
}

// research melee attack tech
Trigger.prototype.RangeSkulltulaB = function (data)
{
    if (data.currentCollection.length > 0)
    {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh lookie, its a ||Gold Skulltula||255 215 0||!",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        let allUnits = [];
        allUnits.push(this.SpawnUnit({ x: 1150, z: 1709, angle: 0, template: "gaia/fauna_spider_skulltula_gold", owner: 0 })); // gold skulltula
        let goldSkulltula = allUnits[0];

        // regular skulltula companion
        allUnits.push(this.SpawnUnit({ x: 1134, z: 1716, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1161, z: 1716, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1159, z: 1698, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));

        // skulltula babies
        allUnits.push(this.SpawnUnit({ x: 1145, z: 1721, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1143, z: 1704, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1162, z: 1707, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));

        let pos = Engine.QueryInterface(data.currentCollection[0], IID_Position).GetPosition2D();
        this.AttackCommand(pos.x, pos.y, allUnits, 0, false); // attack the intruder

        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});

        cmpTrigger.DisableTrigger("OnRange", "RangeSkulltulaB"); // skulltula batch spawned, disable trigger
        this.CheckSkulltulaB(goldSkulltula); // check when the skulltula dies
    }
}

Trigger.prototype.CheckSkulltulaB = function (skulltula)
{
    if (Engine.QueryInterface(skulltula, IID_Health) == undefined)
    {
        this.PlayUISound("audio/interface/alarm/alarmupgradearmory_1.ogg");
        cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Look at this shiny ||Gold Skulltula||255 215 0|| that we just got, its valuable metal will surely help bolster the armor of the ||Gohma||0 100 0||!",
                soundIndex: 0,
                portraitSuffix: "_victorious"
            });

        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});

        // research both armor upgrades for the player and the AI Gohma
        let cmpTechnologyManager = QueryPlayerIDInterface(1, IID_TechnologyManager);
        cmpTechnologyManager.ResearchTechnology("gohma/armor_goh_all_01"); 
        cmpTechnologyManager.ResearchTechnology("gohma/armor_goh_all_02");

        cmpTechnologyManager = QueryPlayerIDInterface(4, IID_TechnologyManager);
        cmpTechnologyManager.ResearchTechnology("gohma/armor_goh_all_01");
        cmpTechnologyManager.ResearchTechnology("gohma/armor_goh_all_02");
    }
    else
        cmpTrigger.DoAfterDelay(1000, "CheckSkulltulaB", skulltula); //recall when the gold skulltula is still alive
}

// research melee attack tech
Trigger.prototype.RangeSkulltulaC = function (data)
{
    if (data.currentCollection.length > 0)
    {
        this.DialogueWindow(
            {
                character: "Agitha",
                dialogue: "Oh lookie, its a ||Gold Skulltula||255 215 0||!",
                soundIndex: 0,
                portraitSuffix: "_happy"
            });

        let allUnits = [];
        allUnits.push(this.SpawnUnit({ x: 1606, z: 248, angle: 0, template: "gaia/fauna_spider_skulltula_gold", owner: 0 })); // gold skulltula
        let goldSkulltula = allUnits[0];

        // regular skulltula companion
        allUnits.push(this.SpawnUnit({ x: 1607, z: 256, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1588, z: 255, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1602, z: 239, angle: 0, template: "gaia/fauna_spider_skulltula", owner: 0 }));

        // skulltula babies
        allUnits.push(this.SpawnUnit({ x: 1610, z: 242, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1589, z: 249, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));
        allUnits.push(this.SpawnUnit({ x: 1611, z: 252, angle: 0, template: "gaia/fauna_spider_skulltula_baby", owner: 0 }));

        let pos = Engine.QueryInterface(data.currentCollection[0], IID_Position).GetPosition2D();
        this.AttackCommand(pos.x, pos.y, allUnits, 0, false); // attack the intruder

        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});

        cmpTrigger.DisableTrigger("OnRange", "RangeSkulltulaC"); // skulltula batch spawned, disable trigger
        this.CheckSkulltulaC(goldSkulltula); // check when the skulltula dies
    }
}

Trigger.prototype.CheckSkulltulaC = function (skulltula)
{
    if (Engine.QueryInterface(skulltula, IID_Health) == undefined)
    {
        this.PlayUISound("audio/interface/alarm/alarmupgradearmory_1.ogg");
        cmpTrigger.DoAfterDelay(1000, "DialogueWindow",
            {
                character: "Agitha",
                dialogue: "Look at this shiny ||Gold Skulltula||255 215 0|| that we just got, its valuable metal will surely sharpen the claws of the ||Gohma||0 100 0||!",
                soundIndex: 0,
                portraitSuffix: "_victorious"
            });

        cmpTrigger.DoAfterDelay(8000, "CloseDialogueWindow", {});

        // research melee upgrade for the player and the AI Gohma
        let cmpTechnologyManager = QueryPlayerIDInterface(1, IID_TechnologyManager);
        cmpTechnologyManager.ResearchTechnology("gohma/attack_goh_melee_01"); 

        cmpTechnologyManager = QueryPlayerIDInterface(4, IID_TechnologyManager);
        cmpTechnologyManager.ResearchTechnology("gohma/attack_goh_melee_01");
    }
    else
        cmpTrigger.DoAfterDelay(1000, "CheckSkulltulaC", skulltula); //recall when the gold skulltula is still alive
}

Trigger.prototype.PlayMusic = function (data)
{
    if (this.musicTimer != 0) // if a music reset is still pending, cancel that reset before initiating a new music track
    {
        cmpTimer.CancelTimer(this.musicTimer);
        this.musicTimer = 0;
    }

    cmpGUIInterface.PushNotification({
        "type": "play-tracks",
        "players": [1],
        "tracks": [data.tracks]
    });

    if (data.resetDelay > 0) // music plays in real time only and is not influenced by game speed, while the ingame delays are, so have to base this timer on Date.now() instead
        this.musicTimer = cmpTrigger.DoAfterDelay(1000, "ResetMusic", {"threshold": Date.now() + data.resetDelay });
}

Trigger.prototype.ResetMusic = function (data)
{
    if (data.threshold) // check if music can be cancelled if there is a threshold time set for it
    {
        if (Date.now() < data.threshold)
        {
            cmpTrigger.DoAfterDelay(1000, "ResetMusic", { "threshold": data.threshold }); // recall this function until the threshold has been reached to reset the music
            return; // also make sure to return before we loop the unlock function constantly
        }
    }

    cmpGUIInterface.PushNotification({
        "type": "unlockMusic",
        "players": [1]
    });

    this.musicTimer = 0; // reset music timer to 0 since we just reset the music
}

/**
 * Units flee to a location given object data
 */
Trigger.prototype.SetUnitFlee = function (data)
{
    this.SetAIStance("none", data.entities, data.playerID); // set stance to none so they wont react to AI states any longer
    this.WalkCommand(data.x, data.z, data.entities, data.playerID, data.queue); // walk to location
    for (let entity of data.entities)
    {
        let cmpUnitAI = Engine.QueryInterface(entity, IID_UnitAI);
        if (!cmpUnitAI)
            return;

        cmpUnitAI.SelectAnimation("move"); // set animation
        cmpUnitAI.SetMoveSpeed(cmpUnitAI.GetRunSpeed()); // set to run speed so they start the run animation instead of walking
    }
}

Trigger.prototype.SquareVectorDistance = function (a, b)
{
    return Math.euclidDistance2DSquared(a[0], a[1], b[0], b[1]);
}

Trigger.prototype.VictoryPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    cmpPlayer.SetState("won", "You have succesfully taken Malkariko Castle.");
    this.PlayMusic({ tracks: "gohma_victory1.ogg", resetDelay: 0 }); // play victory music
    this.CampaignEndUI({ image: "gohma_victoryA" }); // show victory screen
}

Trigger.prototype.DefeatPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    cmpPlayer.SetState("defeated", "One of your heroes has perished in the assault on Malkariko, or you have lost your first base.");
    this.CampaignEndUI({ image: "gohma_defeatA" });
    let list = TriggerHelper.GetPlayerEntitiesByClass(0, "Gohma"); // need to grab the list after the defeat to gaia because the previous player1 indices would now be invalid
    let list2 = TriggerHelper.GetPlayerEntitiesByClass(4, "Gohma"); // make new list for the gohma nest units because they have a different player ID

    this.SetUnitFlee({ x: 0, z: 0, entities: list, playerID: 0, queue: false }); // units flee to [0, 0] and disappear there
    this.RemoveAtFleeLocation({ list: list, x: 0, z: 0, threshold: 442 }); // they can never reach 0,0 because this is a circular map (calculated dist is around 437 when exactly on point so add 5 to that value)

    this.SetUnitFlee({ x: 0, z: 0, entities: list2, playerID: 4, queue: false });
    this.RemoveAtFleeLocation({ list: list2, x: 0, z: 0, threshold: 442 }); 
}

Trigger.prototype.RemoveAtFleeLocation = function (data)
{
    let indices = []; // indices that have to be removed from the list
    let list = data.list;
    for (let i = 0; i < list.length; i++)
    {
        let cmpPos = Engine.QueryInterface(list[i], IID_Position);
        if (!cmpPos || !cmpPos.IsInWorld())
        {
            indices.push(i); // no pos must mean its invalid, add to removal list
            continue;
        }

        let Pos2D = cmpPos.GetPosition2D();
        let dist = this.SquareVectorDistance([Pos2D.x, Pos2D.y], [data.x, data.z]); // squared dist between given removal pos and the entities position
        if (dist < data.threshold * data.threshold) // check dist with threshold provided
        {
            indices.push(i); // entity is close enough, so add to removal list
            Engine.DestroyEntity(list[i]); // destroy entity
        }
    }

    let updatedList = this.RemoveIndices(indices, list);
    if (updatedList.length > 0)
        cmpTrigger.DoAfterDelay(500, "RemoveAtFleeLocation", { list: updatedList, x: data.x, z: data.z, threshold: data.threshold }); // recall removal check until the list is empty
}

Trigger.prototype.UpdateList = function (list)
{
    let removedIndices = [];
    for (let i = 0; i < list.length; i++) {
        let ent = list[i];
        if (Engine.QueryInterface(ent, IID_Health) == undefined) // could make this based on SetRemove parameter inside the unit arrays later
            removedIndices.push(i);
    }
    this.RemoveIndices(removedIndices, list);
}

// update a given list by deleting removed game elements from it
Trigger.prototype.RemoveIndices = function (removedIndices, originList)
{
    // while splicing, an element is taken from a list, and every element above it is dropped down by 1 index position
    // this removal system works because the index list provided is always organized from the lowest to the highest index
    // if you take away for example index 8 first, and index 4 afterward, index 4 will be decreased by count and become index 3 instead of 4
    // This is a problem because index 4 actually hasnt been decreased by the removal of index 8, because it only dropped down all elements above index 8 and not below

    let count = 0;
    for (let index of removedIndices)
    {
        let newIndex = +index - +count; // for every element deleted, the indices all go down by 1, so cancel that by adding 1 back for every iteration
        originList.splice(newIndex, 1); // splice element
        count += 1; // keep track of the iteration count for valid splicing
    }
    return originList;
}

// spawns (and potentially destroys) a vision object for a player at a specific location
Trigger.prototype.SpawnVision = function (data)
{
    let ent = Engine.AddEntity("structures/map_revealer_" + data.size); // small, medium or large
    let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
    if (!cmpEntPosition) {
        Engine.DestroyEntity(ent);
        return;
    }

    let cmpEntOwnership = Engine.QueryInterface(ent, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(data.owner);

    cmpEntPosition.JumpTo(data.x, data.z);

    if (data.resetDelay > 0)
        cmpTrigger.DoAfterDelay(data.resetDelay, "DestroyEnt", ent);

    return ent;
}

Trigger.prototype.SpawnBuilding = function (data)
{
    let ent = 0;
    if(data.asFoundation == true)
        ent = Engine.AddEntity("foundation|" + data.template); 
    else
        ent = Engine.AddEntity(data.template); 

    let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
    if (!cmpEntPosition) {
        Engine.DestroyEntity(ent);
        return;
    }

    let cmpEntOwnership = Engine.QueryInterface(ent, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(data.owner);

    cmpEntPosition.JumpTo(data.x, data.z);
    cmpEntPosition.SetYRotation(data.angle);

    if (data.asFoundation == true) {
        let cmpFoundation = Engine.QueryInterface(ent, IID_Foundation);
        cmpFoundation.InitialiseConstruction(data.owner, data.template);
    }

    return ent;
}

Trigger.prototype.SpawnUnit = function (data) {

    let ent = Engine.AddEntity(data.template);
    let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
    if (!cmpEntPosition) {
        Engine.DestroyEntity(ent);
        return;
    }

    let cmpEntOwnership = Engine.QueryInterface(ent, IID_Ownership);
    if (cmpEntOwnership)
        cmpEntOwnership.SetOwner(data.owner);

    cmpEntPosition.JumpTo(data.x, data.z);
    cmpEntPosition.SetYRotation(data.angle);

    return ent;
}

Trigger.prototype.PlayUnitSound = function (data)
{
    let cmpUnitAI = Engine.QueryInterface(data.entity, IID_UnitAI);
    if (!cmpUnitAI)
        return;

    cmpUnitAI.PlaySound(data.name);
}

Trigger.prototype.DestroyEnt = function (ent)
{
    Engine.DestroyEntity(ent);
}

Trigger.prototype.SetInvulnerability = function (ent, state)
{
    let cmpArmour = Engine.QueryInterface(ent, IID_DamageReceiver);
    if (!cmpArmour)
        return;
    cmpArmour.SetInvulnerability(state);
}

Trigger.prototype.WalkCommand = function (x, z, entities, playerID, queue, type = "walk")
{
    let cmd = {};
    cmd.type = type;
    cmd.x = x;
    cmd.z = z;
    cmd.entities = entities;
    cmd.queued = queue;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.AttackCommand = function (x, z, entities, playerID, queue, type = "attack-walk")
{
    let cmd = {};
    cmd.type = type;
    cmd.x = x;
    cmd.z = z;
    cmd.entities = entities;
    cmd.targetClasses = { "attack": ["Unit", "Structure"] };
    cmd.allowCapture = false;
    cmd.queued = queue;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.SetAIStance = function (name, entities, playerID, type = "stance")
{
    let cmd = {};
    cmd.type = type;
    cmd.entities = entities;
    cmd.name = name;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.ConstructCommand = function (x, z, angle, template, playerID, type = "construct") {

    let cmd = {};
    cmd.type = type;
    cmd.entities = [this.Agitha];
    cmd.template = template;
    cmd.x = x;
    cmd.z = z;
    cmd.angle = angle;
    cmd.autorepair = angle;
    cmd.autocontinue = angle;
    cmd.queued = angle;
    ProcessCommand(playerID, cmd);
}

Trigger.prototype.RevealMap = function (data)
{
    let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    cmpRangeManager.SetLosRevealAll(-1, data.state);
}

Trigger.prototype.StopCinematicCamera = function ()
{
    cmpCinemaManager.Stop();
}