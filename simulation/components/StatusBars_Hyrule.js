const g_NaturalColor = "255 255 255 255"; // pure white

StatusBars.prototype.UpdateCaptureZoneBar = function()
{
	this.RegenerateSprites();
}

StatusBars.prototype.AddCaptureZoneBar = function (cmpOverlayRenderer, yoffset)
{
	let cmpCaptureZone = Engine.QueryInterface(this.entity, IID_CaptureZone);
	if (!cmpCaptureZone){
		return 0;
	}

	let cmpOwnership = QueryMiragedInterface(this.entity, IID_Ownership);
	if (!cmpOwnership)
		return 0;

	let owner = cmpOwnership.GetOwner();
	if (owner == INVALID_PLAYER)
		return 0;

	let captureRate = cmpCaptureZone.GetCaptureRate();
	let capturePointsNeeded = cmpCaptureZone.GetCapturePointsNeeded();
	let playerWithCapturePoints = cmpCaptureZone.GetPlayerWithCapturePoints();

	// Size of health bar (in world-space units)
	let width = +this.template.BarWidth;
	let height = +this.template.BarHeight;

	// World-space offset from the unit's position
	let offset = { "x": 0, "y": +this.template.HeightOffset, "z": 0 };

	let setCaptureZoneBarPart = function(playerID, startSize)
	{
		let c = QueryPlayerIDInterface(playerID).GetDisplayedColor();
		let strColor = (c.r * 255) + " " + (c.g * 255) + " " + (c.b * 255) + " 255";
		let size = width * captureRate;

		// background
		cmpOverlayRenderer.AddSprite(
			"art/textures/ui/session/icons/capture_bar.png",
			{ "x": startSize, "y": yoffset },
			{ "x": -startSize, "y": height + yoffset },
			offset,
			g_NaturalColor
		);

		// foreground
		cmpOverlayRenderer.AddSprite(
			"art/textures/ui/session/icons/capture_bar.png",
			{ "x": startSize, "y": yoffset },
			{ "x": startSize + size, "y": height + yoffset },
			offset,
			strColor
		);

		return size + startSize;
	};

	if (playerWithCapturePoints){
		let size = setCaptureZoneBarPart(playerWithCapturePoints, -width / 2);
	}
	return height * 1.2;
}

StatusBars.prototype.AddStealthIcon = function (cmpOverlayRenderer, yoffset)
{
    if (!this.enabled)
        return 0; // dont show this unit if it isnt Selected/Enabled

    //Check if the unit has stealth first
    let cmpVisibility = Engine.QueryInterface(this.entity, IID_Visibility);
    if (cmpVisibility == undefined || cmpVisibility.hasStealth != true)
        return 0;

    // Get the correct icon based on whether the unit is currently stealthed or not
    let iconPath = "art/textures/ui/session/auras/stealth_icon.dds";
    if (cmpVisibility.stealthed == false)
        iconPath = "art/textures/ui/session/auras/stealth_icon_off.dds";

    // World-space offset from the unit's position
    let offset = { "x": 0, "y": +this.template.HeightOffset + yoffset, "z": 0 };
    let iconSize = +this.template.BarWidth * 1.25; // Icon Size
    let xoffset = -iconSize * (1 - 1) * 0.6;
    cmpOverlayRenderer.AddSprite(
        iconPath,
        { "x": xoffset - iconSize / 2, "y": yoffset },
        { "x": xoffset + iconSize / 2, "y": iconSize + yoffset },
        offset,
        g_NaturalColor
    );
    xoffset += iconSize * 1.2;
    return iconSize + this.template.BarHeight / 2;
};
