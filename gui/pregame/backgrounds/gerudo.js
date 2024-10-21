g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-gerudo-1",
			"tiling": true,
		},
		{
			"offset": (time, width) => -0.17 * width * Math.cos(0.05 * time),
			"sprite": "background-gerudo-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.22 * width * Math.cos(0.05 * time),
			"sprite": "background-gerudo-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => 10.12 * width * Math.cos(0.05 * time),
			"sprite": "background-gerudo-4",
			"tiling": true,
		},
		{
			"offset": (time, width) => 5.12 * width * Math.cos(0.05 * time),
			"sprite": "background-gerudo-5",
			"tiling": true,
		},
	]);
