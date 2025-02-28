{
    var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    var cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);

    cmpTrigger.playerArmy = TriggerHelper.GetPlayerEntitiesByClass(1, "Unit");

    cmpTrigger.DoAfterDelay(200, "IntroStart", {});
    // cmpTrigger.DoAfterDelay(5000, "VictoryPlayer", {});
}

Trigger.prototype.IntroStart = function ()
{
    this.PlayMusic({ track: "ordona_ambient4.ogg" });
    const wagons = TriggerHelper.MatchEntitiesByClass(this.playerArmy, "Wagon");
    const soldiers = this.RemoveEntitiesByClass(this.playerArmy, "Wagon");

    TriggerHelper.SetUnitFormation(1, wagons,"special/formations/HC_standard")
    TriggerHelper.SetUnitFormation(1, soldiers,"special/formations/HC_standard")
    
    for(let ent of wagons) this.SetSpeedMultiplier(ent, 0.4);
    for(let ent of soldiers) this.SetSpeedMultiplier(ent, 0.4);

    cmpTrigger.DoAfterDelay(10000, "IntroMove", { wagons: wagons, soldiers: soldiers });
    cmpTrigger.DoAfterDelay(45000, "StartAmbush", {});

    this.DialogueWindow({
        character: "Colin",
        dialogue: `Thank you for bringing me north with you for this trip father!`,
        soundIndex: 1,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Colin",
        dialogue: `The mighty walls of the ||Kingdom's Capital||153 0 255|| were mightier than I could have ever imagined!`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Rusl",
        dialogue: `Of course my son, one day you will be responsible for overseeing such journeys.`,
        soundIndex: 3,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Rusl",
        dialogue: `It is time you start learning more about the north firsthand.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Colin",
        dialogue: `Perhaps I can be knighted as one of the ||Valiant||127 96 0|| soon too?`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Rusl",
        dialogue: `All in time my son. You still have much to learn`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Colin",
        dialogue: `Speaking of father.. Is it not odd that we have not been hailed yet by any of the rangers yet?`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 5000,
    });

    this.DialogueWindow({
        character: "Colin",
        dialogue: `It has been some time since we crossed the border into ||Ordona Province||127 96 0||.`,
        soundIndex: 2,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Colin",
        dialogue: `Surely we would have encountered one of your patrols by now.`,
        soundIndex: -1,
        portraitSuffix: "_",
        runtime: 4000,
    });

    this.DialogueWindow({
        character: "Rusl",
        dialogue: `Hmmm... That is indeed odd. Sharp thinking son.`,
        soundIndex: 4,
        portraitSuffix: "_",
        runtime: 3000,
    });

    this.DialogueWindow({
        character: "Rusl",
        dialogue: `Keep a keen out men, I've got a bad feeling about this.`,
        soundIndex: 6,
        portraitSuffix: "_",
        runtime: 3000,
    });
}

Trigger.prototype.IntroMove = function (data)
{
    this.WalkCommand(1300, 750, data.wagons, 1, false);
    this.WalkCommand(1280, 750, data.soldiers, 1, false);
}

Trigger.prototype.StartAmbush = function (data)
{
    warn("starting ambush now!");
}