import { Alignment, Fit, Layout, Rive, RiveFile, type ViewModelInstance } from '@rive-app/webgl2';

export interface RigProperty {
	name: string;
	type: string;
	// Only enum properties have values; every other type leaves this empty.
	values: string[];
}

export interface Rig {
	rive: Rive;
	instance: ViewModelInstance;
	properties: RigProperty[];
	dispose: () => void;
}

const listProperties = (instance: ViewModelInstance): RigProperty[] =>
	instance.properties.map((property) => ({
		name: property.name,
		type: property.type,
		values: instance.enum(property.name)?.values ?? [],
	}));

export const loadRig = async (buffer: ArrayBuffer, canvas: HTMLCanvasElement): Promise<Rig> => {
	const riveFile = new RiveFile({ buffer });
	await riveFile.init();

	return new Promise((resolve, reject) => {
		const rive = new Rive({
			riveFile,
			canvas,
			autoplay: true,
			// Contain keeps the rig's aspect ratio and centers it, so it scales uniformly.
			layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
			onLoad: () => {
				const instance = rive.defaultViewModel()?.defaultInstance();
				if (!instance) {
					reject(new Error('This rig has no default view model instance.'));
					return;
				}
				rive.bindViewModelInstance(instance);

				// The drawing surface is a bitmap, so it must be resized whenever the displayed box or the
				// device pixel ratio (browser zoom) changes. Otherwise the rig is drawn at the old size.
				const resize = () => {
					rive.resizeDrawingSurfaceToCanvas();
					rive.resizeToCanvas();
				};
				const observer = new ResizeObserver(resize);
				observer.observe(canvas);
				window.addEventListener('resize', resize);
				resize();

				resolve({
					rive,
					instance,
					properties: listProperties(instance),
					dispose: () => {
						observer.disconnect();
						window.removeEventListener('resize', resize);
						rive.cleanup();
					},
				});
			},
			onLoadError: (event) => {
				const detail =
					typeof event.data === 'string' ? event.data : 'Rive could not load this file.';
				reject(new Error(detail));
			},
		});
	});
};
