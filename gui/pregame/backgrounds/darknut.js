g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-darknut-1",
			"tiling": false,
		},

		{
			"offset": (time, width) => 0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-darknut-2",
			"tiling": false,
		},

		{
			"offset": (time, width) => -0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-darknut-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => 0.31 * width * Math.cos(0.05 * time),
			"sprite": "background-darknut-4",
			"tiling": false,
		},
		{
			"offset": (time, width) => 0.09 * width * Math.cos(0.05 * time),
			"sprite": "background-darknut-5",
			"tiling": false,
		},
	]);
