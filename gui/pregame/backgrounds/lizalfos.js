g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-lizalfos-1",
			"tiling": true,
		},
		
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-lizalfos-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-lizalfos-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => 0.17 * width * Math.cos(0.06 * time),
			"sprite": "background-lizalfos-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.21 * width * Math.cos(0.07 * time),
			"sprite": "background-lizalfos-5",
			"tiling": false,
		},	
	]);
