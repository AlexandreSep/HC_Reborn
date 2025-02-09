{
    var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
    var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    var cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);
    var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);

    cmpTrigger.DoAfterDelay(1000, "PostInit", {});
    // cmpTrigger.DoAfterDelay(5000, "VictoryPlayer", {});
}

Trigger.prototype.PostInit = function ()
{
    this.PlayMusic({ track: "gohma_victory1.ogg", resetDelay: 5000 });
}

Trigger.prototype.VictoryPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    cmpPlayer.SetState("won", "You have succesfully completed the mission.");
    this.PlayMusic({ track: "gohma_victory1.ogg", resetDelay: 0 }); // play victory music
    // this.CampaignEndUI({ image: "gohma_victoryA" }); // show victory screen
}

Trigger.prototype.DefeatPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    cmpPlayer.SetState("defeated", "One of your heroes has perished in the assault on Malkariko, or you have lost your first base.");
    // this.CampaignEndUI({ image: "gohma_defeatA" });
}

Trigger.prototype.PlayMusic = function (data)
{
    if (this.musicTimer != 0) // if a music reset is still pending, cancel that reset before initiating a new music track
    {
        cmpTimer.CancelTimer(this.musicTimer);
        this.musicTimer = 0;
    }

    cmpGUIInterface.PushNotification({
        "type": "play-custom-track",
        "players": [1],
        "track": data.track
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

Trigger.prototype.CampaignEndUI = function (data) // push dialogue with sound and imagery to the window
{
    cmpGUIInterface.PushNotification({
        "type": "campaignEnd",
        "players": [1],
        "image": data.image
    });
};