{
    var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    var cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);

    cmpTrigger.playerArmy = TriggerHelper.GetPlayerEntitiesByClass(1, "Unit");

    cmpTrigger.DoAfterDelay(200, "Intro", {});
    // cmpTrigger.DoAfterDelay(5000, "VictoryPlayer", {});
}

Trigger.prototype.Intro = function ()
{
    this.PlayMusic({ track: "ordona_ambient4.ogg" });
    this.WalkCommand(1300, 750, this.playerArmy, 1, false);
    cmpTrigger.DoAfterDelay(500, "DialogueWindow", {
        character: "Rusl",
        dialogue: "Hey ||Colin||255 0 0||, I'm testing the mission!",
        soundIndex: 2,
        portraitSuffix: "_"
    });

    cmpTrigger.DoAfterDelay(5500, "DialogueWindow", {
        character: "Colin",
        dialogue: "Don't you think its a little odd that we haven't met any farmer thus far ||Dad||0 100 255||?",
        soundIndex: 3,
        portraitSuffix: "_"
    });

    cmpTrigger.DoAfterDelay(10500, "DialogueWindow", {
        character: "Rusl",
        dialogue: "You're correct, the ||Ordonian Fields||255 255 0|| do seem awfully forsaken...",
        soundIndex: 4,
        portraitSuffix: "_"
    });

    cmpTrigger.DoAfterDelay(15500, "DialogueWindow", {
        character: "Colin",
        dialogue: "Now I'm on guard!",
        soundIndex: 2,
        portraitSuffix: "_"
    });

    cmpTrigger.DoAfterDelay(22000, "CloseDialogueWindow", {});
}