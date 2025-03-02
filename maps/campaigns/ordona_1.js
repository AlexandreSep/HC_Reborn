{
    var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    var cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);

    cmpTrigger.serfs1 = [];
    for(let i = 1438; i <= 1446; i++) cmpTrigger.serfs1.push(i);
    cmpTrigger.serfs2 = [];
    for(let i = 1626; i <= 1636; i++) cmpTrigger.serfs2.push(i);
    cmpTrigger.serfs3 = [];
    for(let i = 1733; i <= 1749; i++) cmpTrigger.serfs3.push(i);
    cmpTrigger.playerArmy = TriggerHelper.GetPlayerEntitiesByClass(1, "Unit");

    cmpTrigger.rusl = 587
    cmpTrigger.colin = 589

    cmpTrigger.RegisterTrigger("OnEntityDeath", "EntityDeathAction", { "enabled": true });

    cmpTrigger.RegisterTrigger("OnRange", "OnStableReached", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("A"), players: [1], minRange: 0, maxRange: 25, requiredComponent: IID_UnitAI }); 

    cmpTrigger.DoAfterDelay(200, "IntroStart", {});
    // cmpTrigger.DoAfterDelay(2000, "VictoryPlayer");
}

Trigger.prototype.EntityDeathAction = function (data) {
    let entity = data.ent;
    if(entity != this.rusl && entity != this.colin) return

    if (entity == this.rusl) {
        this.DialogueWindow({
            character: "Colin",
            dialogue: `Oh no! Dad! This can't be happening!`,
            soundIndex: 7,
            portraitSuffix: "_",
            runtime: 10000,
            clear: true
        });
    }
    else {
        this.DialogueWindow({
            character: "Rusl",
            dialogue: `Colin! My poor boy! This can't be happening!`,
            soundIndex: 7,
            portraitSuffix: "_",
            runtime: 10000,
            clear: true
        });
    }

    this.DoAfterDelay(2000, "DefeatPlayer", {});
    this.DisableTrigger("OnEntityDeath", "EntityDeathAction");
}

Trigger.prototype.IntroStart = function ()
{
    this.PlayMusic({ tracks: ["ordona_ambient4.ogg"] });

    for(let serf of this.serfs1) this.SetInvulnerability(serf, true);
    for(let serf of this.serfs2) this.SetInvulnerability(serf, true);
    for(let serf of this.serfs3) this.SetInvulnerability(serf, true);

    this.SpawnVision({ x: 1300, z: 750, resetDelay: 15000, owner: 1, size: "medium" })
    // this.RevealMap({ state: true });

    const wagons = TriggerHelper.MatchEntitiesByClass(this.playerArmy, "Wagon");
    const soldiers = this.RemoveEntitiesByClass(this.playerArmy, "Wagon");

    for(let wagon of wagons) this.DoAfterDelay(1000, "InitGarrison", wagon);

    TriggerHelper.SetUnitFormation(1, wagons,"special/formations/HC_standard")
    TriggerHelper.SetUnitFormation(1, soldiers,"special/formations/HC_standard")
    
    for(let ent of wagons) this.SetSpeedMultiplier(ent, 0.4);
    for(let ent of soldiers) this.SetSpeedMultiplier(ent, 0.4);

    this.DoAfterDelay(10000, "IntroMove", { wagons: wagons, soldiers: soldiers });
    this.DoAfterDelay(45000, "StartAmbush", {});

    this.DialogueWindow({
        character: "Colin",
        dialogue: `Thank you for bringing me north with you for this trip father!`,
        soundIndex: 1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(4000, "DialogueWindow", {
        character: "Colin",
        dialogue: `The mighty walls of the ||Kingdom's Capital||153 0 255|| were mightier than I could have ever imagined!`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(8000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Of course my son, one day you will be responsible for overseeing such journeys.`,
        soundIndex: 3,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(12000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `It is time you start learning more about the north firsthand.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(16000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Perhaps I can be knighted as one of the ||Valiant||127 96 0|| soon too?`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(20000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `All in time my son. You still have much to learn.`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(24000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Speaking of father.. Isn't it odd that we haven't been hailed by any of the rangers yet?`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 5000,
        clear: true
    });

    this.DoAfterDelay(29000, "DialogueWindow", {
        character: "Colin",
        dialogue: `It has been some time since we crossed the border into ||Ordona Province||127 96 0||.`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(33000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Surely we would have encountered one of your patrols by now.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(37000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Hmmm... That is indeed odd. Sharp thinking son.`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 3000,
        clear: true
    });

    this.DoAfterDelay(40000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Keep a keen out men, I've got a bad feeling about this.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 3000,
        clear: true
    });
}

Trigger.prototype.IntroMove = function (data)
{
    this.WalkCommand(1300, 750, data.wagons, 1, false);
    this.WalkCommand(1280, 750, data.soldiers, 1, false);
}

Trigger.prototype.StartAmbush = function ()
{
    for(let ent of this.playerArmy) this.ResetSpeedMultiplier(ent);

    this.ambushArmy = [];
    this.ambushArmy.push(this.SpawnUnit({ x: 1300, z: 850, angle: 0, template: "units/gerudo/gerudo_ashcap_b", owner: 4 }))
    this.ambushArmy.push(this.SpawnUnit({ x: 1300, z: 650, angle: 0, template: "units/gerudo/gerudo_ashcap_b", owner: 4 }))
    for (let i = 0; i < 5; i++) {
        this.ambushArmy.push(this.SpawnUnit({ x: 1250 + i * 10, z: 850, angle: 0, template: "units/gerudo/gerudo_marauder_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 1250 + i * 10, z: 650, angle: 0, template: "units/gerudo/gerudo_marauder_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 1300 + i * 10, z: 850, angle: 0, template: "units/gerudo/gerudo_glaivegrunt_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 1300 + i * 10, z: 650, angle: 0, template: "units/gerudo/gerudo_glaivegrunt_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 1275 + i * 10, z: 850, angle: 0, template: "units/gerudo/gerudo_sandsniper_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 1300 + i * 10, z: 650, angle: 0, template: "units/gerudo/gerudo_sandsniper_b", owner: 4 }))
    }
    
    this.AttackCommand(1300, 750, this.ambushArmy, 4, false);

    this.PlayMusic({ tracks: ["ordona_battle1.ogg"] });
    this.DialogueWindow({
        character: "Rusl",
        dialogue: `Gerudo?! It's an ambush! To arms men!`,
        soundIndex: 5,
        portraitSuffix: "_",
        runtime: 4000,
    });

    let delay = 25;
    for (let ent of this.ambushArmy) {
        this.DoAfterDelay(4000 + delay, "PlayUnitSound", { entity: ent, name: "order_attack" });
        delay += 25;
    }

    this.CheckAmbushArmyDefeated();
}

Trigger.prototype.CheckAmbushArmyDefeated = function ()
{
    this.UpdateList(this.ambushArmy)
    warn("this.ambushArmy " + this.ambushArmy.length);
    if(this.ambushArmy.length < 1) this.AmbushDefeated();
    else this.DoAfterDelay(1000, "CheckAmbushArmyDefeated", {})
}

Trigger.prototype.AmbushDefeated = function ()
{
    this.PlayMusic({ tracks: ["ordona_ambient4.ogg"] });

    warn("AmbushDefeated")
    this.DialogueWindow({
        character: "Colin",
        dialogue: `What in the goddess' name could Gerudo be doing this far east?!`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(4000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Their thieves never journey this far from the ||Gerudo Highlands||230 145 56||!`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(8000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `I'm not sure, but I fear the main reason is far more troubling than meets the eye.`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(12000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `We must follow this road to ||Nal Ordona||127 96 0|| and alert the militias my son!`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 8000,
        clear: true
    });

    this.DoAfterDelay(12000, "SpawnVision", { x: 1178, z: 655, resetDelay: 5000, owner: 1, size: "medium" })
    this.DoAfterDelay(12000, "SpawnVision", { x: 1003, z: 605, resetDelay: 5000, owner: 1, size: "medium" })
    this.DoAfterDelay(12000, "SpawnVision", { x: 804, z: 541, resetDelay: 5000, owner: 1, size: "medium" })
    this.DoAfterDelay(12000, "SpawnVision", { x: 610, z: 539, resetDelay: 5000, owner: 1, size: "medium" })
}

Trigger.prototype.OnStableReached = function (data) {
    if (data.currentCollection.find(ent => ent == this.rusl || ent == this.colin) == undefined) return;

    const reverend = [1355];
    this.UpdateList(reverend)
    if(reverend.length > 0) {
        this.PlayUISound("audio/voice/ordona/reverend/reverend_select_01.ogg");
        this.DialogueWindow({
            character: "Reverend",
            dialogue: `Ah! Thank goodness. Its good to see a few familiar faces.`,
            soundIndex: -1,
            portraitSuffix: "_",
            runtime: 4000,
            clear: true
        });

        this.DoAfterDelay(4000, "PlayUISound", "audio/voice/ordona/reverend/reverend_select_02.ogg");
        this.DoAfterDelay(4000, "DialogueWindow", {
            character: "Reverend",
            dialogue: `Those Moblin and Gerudo Invaders have setup camp around all over these lands.`,
            soundIndex: -1,
            portraitSuffix: "_",
            runtime: 4000,
            clear: true
        });

        this.DoAfterDelay(8000, "SpawnStableUnits", {});
    }
    this.DisableTrigger("OnRange", "OnStableReached");
}

Trigger.prototype.SpawnStableUnits = function () {
    for(let i = 0; i < 5; i++) { 
        const horseman = this.SpawnUnit({ x: 985 + i * 5, z: 800, angle: 0, template: "units/ordona/ordona_horseman_b", owner: 1 })
        this.PlayUnitSound({ entity: horseman, name: "select" })
    }
    this.DialogueWindow({
        character: "Horseman",
        dialogue: `The invaders must be stopped, we shall fight with you for our countryside.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 8000,
        clear: true
    });
}