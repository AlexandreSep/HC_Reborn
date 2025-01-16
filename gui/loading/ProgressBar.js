/**
 * This class will display the progress of the map loading by animating a progress bar.
 * Optionally it displays the current stage of the loading screen.
 */
class ProgressBar
{
	constructor()
	{

		this.progressbar = Engine.GetGUIObjectByName("progressbar");
		this.progressbar.onGameLoadProgress = this.onGameLoadProgress.bind(this);
		this.progressBarSize = this.progressbar.size.right - this.progressbar.size.left;

		this.progressText = Engine.GetGUIObjectByName("progressText");
		this.showDescription = Engine.ConfigDB_GetValue("user", this.ConfigKey) == "true";
		this.percentArgs = !this.showDescription && {};
	}

	onGameLoadProgress(progression, description)
	{
		// Make the progessbar finish a little early so that the player can see it finish
		if (progression >= 100)
			return;

		// Show 100 when it is really 99
		let progress = progression + 1;
		this.progressbar.progress = progress;

		if (this.showDescription)
			this.progressText.caption = description;
		else
		{
			this.percentArgs.percentage = progress;
			this.progressText.caption = sprintf(this.CaptionFormat, this.percentArgs);
		}

	}
}

ProgressBar.prototype.CaptionFormat =
	translateWithContext("loading screen progress", "%(percentage)s%%");

ProgressBar.prototype.ConfigKey =
	"gui.loadingscreen.progressdescription";
