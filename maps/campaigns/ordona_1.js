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
    cmpTrigger.allyArmy = TriggerHelper.GetPlayerEntitiesByClass(2, "Unit");

    cmpTrigger.rusl = 587
    cmpTrigger.colin = 589
    cmpTrigger.cremia = 624
    cmpTrigger.cremiaIdentityDiscovered = false

    cmpTrigger.RegisterTrigger("OnEntityDeath", "EntityDeathAction", { "enabled": true });

    cmpTrigger.RegisterTrigger("OnRange", "OnStableReached", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("A"), players: [1], minRange: 0, maxRange: 25, requiredComponent: IID_UnitAI }); 
    cmpTrigger.RegisterTrigger("OnRange", "OnCremiaReached", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("G"), players: [1], minRange: 0, maxRange: 150, requiredComponent: IID_UnitAI }); 

    cmpTrigger.DoAfterDelay(200, "PostInit", {});
    cmpTrigger.DoAfterDelay(400, "IntroStart", {});
    // cmpTrigger.DoAfterDelay(2000, "VictoryPlayer");
}

Trigger.prototype.EntityDeathAction = function (data) {
    let entity = data.ent;
    if(entity != this.rusl && entity != this.colin && entity != this.cremia) return

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
    else if(entity == this.colin) {
        this.DialogueWindow({
            character: "Rusl",
            dialogue: `Colin! My poor boy! This can't be happening!`,
            soundIndex: 7,
            portraitSuffix: "_",
            runtime: 10000,
            clear: true
        });
    }
    else if(entity == this.cremia) {
        if(!this.cremiaIdentityDiscovered) {
            this.DialogueWindow({
                character: "Rusl",
                dialogue: `The caravan leader has perished! We have failed my son!`,
                soundIndex: 7,
                portraitSuffix: "_",
                runtime: 10000,
                clear: true
            });
        }
    }

    this.DoAfterDelay(2000, "DefeatPlayer", {});
    this.DisableTrigger("OnEntityDeath", "EntityDeathAction");
}

Trigger.prototype.PostInit = function () {
    for(let serf of this.serfs1) this.SetInvulnerability(serf, true);
    for(let serf of this.serfs2) this.SetInvulnerability(serf, true);
    for(let serf of this.serfs3) this.SetInvulnerability(serf, true);

    this.SpawnVision({ x: 1300, z: 750, resetDelay: 15000, owner: 1, size: "medium" })

    this.PlayMusic({ tracks: ["ordona_ambient4.ogg"] });

    for(let entity of this.allyArmy) this.DoAfterDelay(1000, "InitGarrison", entity);
    
    // gerudo sentry towers
    this.DoAfterDelay(1000, "InitGarrison", 1806);
    this.DoAfterDelay(1000, "InitGarrison", 1807);

    // moblin defense towers
    this.DoAfterDelay(1000, "InitGarrison", 1370);
    this.DoAfterDelay(1000, "InitGarrison", 1371);
    this.DoAfterDelay(1000, "InitGarrison", 1375);
}

Trigger.prototype.IntroStart = function ()
{
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

    this.AttackYell(this.ambushArmy, 4000);

    this.CheckAmbushArmyDefeated();
}

Trigger.prototype.CheckAmbushArmyDefeated = function ()
{
    this.UpdateList(this.ambushArmy)
    if(this.ambushArmy.length < 1) this.AmbushDefeated();
    else this.DoAfterDelay(1000, "CheckAmbushArmyDefeated", {})
}

Trigger.prototype.AmbushDefeated = function ()
{
    this.PlayMusic({ tracks: ["ordona_ambient4.ogg"] });

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
            dialogue: `Those ||Moblin||133 32 12|| and ||Gerudo||230 145 56|| Invaders have setup camp around all over these lands.`,
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

Trigger.prototype.OnCremiaReached = function (data) {
    if (data.currentCollection.length < 1) return;

    this.DialogueWindow({
        character: "Cremia",
        dialogue: `Form up and defend the ||cargo||74 134 232||! Be brave and stand your ground!`,
        soundIndex: 1,
        portraitSuffix: "_",
        runtime: 5000,
        clear: true
    });

    this.ambushArmy = [];
    this.ambushArmy.push(this.SpawnUnit({ x: 380, z: 680, angle: 0, template: "units/gerudo/gerudo_ashcap_b", owner: 4 }))
    this.ambushArmy.push(this.SpawnUnit({ x: 380, z: 520, angle: 0, template: "units/gerudo/gerudo_ashcap_b", owner: 4 }))
    this.ambushArmy.push(this.SpawnUnit({ x: 380, z: 520, angle: 0, template: "units/gerudo/gerudo_masterthief_b", owner: 4 }))
    this.ambushArmy.push(this.SpawnUnit({ x: 380, z: 520, angle: 0, template: "units/gerudo/gerudo_masterthief_b", owner: 4 }))
    for (let i = 0; i < 5; i++) {
        this.ambushArmy.push(this.SpawnUnit({ x: 350 + i * 5, z: 680, angle: 0, template: "units/gerudo/gerudo_marauder_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 350 + i * 5, z: 520, angle: 0, template: "units/gerudo/gerudo_marauder_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 350 + i * 5, z: 680, angle: 0, template: "units/gerudo/gerudo_glaivegrunt_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 350 + i * 5, z: 520, angle: 0, template: "units/gerudo/gerudo_glaivegrunt_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 350 + i * 5, z: 680, angle: 0, template: "units/gerudo/gerudo_sandsniper_b", owner: 4 }))
        this.ambushArmy.push(this.SpawnUnit({ x: 350 + i * 5, z: 520, angle: 0, template: "units/gerudo/gerudo_sandsniper_b", owner: 4 }))
    }

    this.AttackYell(this.ambushArmy, 1000)
    this.AttackYell(this.allyArmy, 3000)

    this.AttackCommand(384, 605, this.ambushArmy, 4, false);

    this.DoAfterDelay(4000, "SpawnVision", { x: 384, z: 605, resetDelay: 30000, owner: 1, size: "medium" })
    this.DoAfterDelay(4000, "PlayMusic", { tracks: ["ordona_battle1.ogg"] });
    this.DoAfterDelay(4000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Did you hear that father?! There! A caravan under attack!`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(8000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Double time men! Charge!`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.CheckCremiaAmbushDefeated();
    this.DisableTrigger("OnRange", "OnCremiaReached");
}

Trigger.prototype.CheckCremiaAmbushDefeated = function ()
{
    this.UpdateList(this.ambushArmy)
    if(this.ambushArmy.length < 1) this.AmbushDefeatedCremia();
    else this.DoAfterDelay(1000, "CheckCremiaAmbushDefeated", {})
}

Trigger.prototype.AmbushDefeatedCremia = function ()
{
    this.PlayMusic({ tracks: ["ordona_ambient4.ogg"] });

    this.UpdateList(this.allyArmy)
    this.allyArmy = this.GetEntsInsideSquare(this.allyArmy, 300, 500, 500, 700);

    this.DialogueWindow({
        character: "Cremia",
        dialogue: `The goddesses have blessed us with your timing! You have my thanks Sir...!`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(4000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Just Rusl is fine ma'am. If I'm not mistaken you're Cremia aren't you?`,
        soundIndex: 1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(8000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `You own the ||Romani Ranch||74 134 232|| to the east. I haven't seen you since you were just a kid.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 6000,
        clear: true
    });

    this.DoAfterDelay(14000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `Ah, now I see! It's been a while since I've journeyed into the heart of the ||province||127 96 0||.`,
        soundIndex: 5,
        portraitSuffix: "_",
        runtime: 6000,
        clear: true
    });

    this.DoAfterDelay(20000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `My father spoke highly of you Rusl. My men and I are forever in your debt...`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(24000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Just doing our duty, so what's the situation? Where are all these ||Gerudo||230 145 56|| coming from?`,
        soundIndex: 3,
        portraitSuffix: "_",
        runtime: 6000,
        clear: true
    });

    this.DoAfterDelay(30000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `We were trying to make haste to the nearest city to find shelter.`,
        soundIndex: 5,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(34000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `There have been bands of ||Moblins||133 32 12|| and ||Gerudo||230 145 56|| rampaging across the Ordona Plains left unchecked for almost a day now.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 6000,
        clear: true
    });

    this.DoAfterDelay(40000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `One of my scouts has reported that its highly probable they are in fact cooperating.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(44000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `That can't be!`,
        soundIndex: 5,
        portraitSuffix: "_",
        runtime: 3000,
        clear: true
    });

    this.DoAfterDelay(47000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `I'm afraid this is reality Rusl. I've fought off ||Blins||133 32 12|| from my farms before but nothing like this.`,
        soundIndex: 5,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(51000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `Hamlets all over the place have been raided, and it seems they've taken prisoners as well.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(55000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `That is rather uncharacteristic, especially when both parties are working together.`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(59000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `Tell me about it. Just nearby there are 3 camps that we are aware of. They're holding locals as well as some of my men captive.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 6000,
        clear: true
    });

    this.DoAfterDelay(65000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Father, what's the plan?`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 3000,
        clear: true
    });

    this.DoAfterDelay(68000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `We shall have to teach these thieves what happens when they leave the safety of their desert.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(71800, "UpdateList", this.allyArmy)
    for(let ent of this.allyArmy) this.DoAfterDelay(72000, "SetEntOwner", { ent: ent, owner: 1 })

    this.DoAfterDelay(72000, "DialogueWindow", {
        character: "Cremia",
        dialogue: `Excellent! I shall leave myself and whatever men I've left at your disposal.`,
        soundIndex: 1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(76000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Thanks Cremia, we can certainly use your aid.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(80000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `We should first establish a base camp and prepare our assault on their camps.`,
        soundIndex: 1,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });

    this.DoAfterDelay(84000, "DialogueWindow", {
        character: "Colin",
        dialogue: `Shouldn't we be wary of more raids dad? Surely they're watching our every move by now.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });
    
    this.DoAfterDelay(88000, "DialogueWindow", {
        character: "Rusl",
        dialogue: `Unfortunately its a risk we'll have to accept for the time being my son.`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
        clear: true
    });
}

