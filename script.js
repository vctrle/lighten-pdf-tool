function showHelp() {
	var x = document.getElementById("help");
	if (x.style.display === "none") {
		x.style.display = "block";
	} else {
		x.style.display = "none";
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const thresholdRange = document.getElementById('threshold-range');
	const thresholdValue = document.getElementById('threshold-value');

	const setBackground = (value) => {
		const colorValue = parseInt(value);
		const hexColor = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
		thresholdRange.style.background = `linear-gradient(to right, ${hexColor} 0%, ${hexColor} ${(value/255)*100}%, #fff ${(value/255)*100}%, #fff 100%)`;
	};

	setBackground(thresholdRange.value);
	thresholdValue.textContent = thresholdRange.value;

	thresholdRange.addEventListener('input', (event) => {
		const value = event.target.value;
		thresholdValue.textContent = value;
		setBackground(value);
	});
});

document.getElementById('convert-button').addEventListener('click', async () => {
	const fileInput = document.getElementById('pdf-upload');
	if (fileInput.files.length === 0) {
		alert('Please upload a PDF file.');
		return;
	}

	const file = fileInput.files[0];
	if (file.type !== 'application/pdf') {
		alert('Please upload a valid PDF file.');
		return;
	}

	const threshold = parseInt(document.getElementById('threshold-range').value);
	const arrayBuffer = await file.arrayBuffer();
	const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
	const pdf = await loadingTask.promise;

	const pdfDoc = await PDFLib.PDFDocument.create();
	const totalPages = pdf.numPages;

	const progressBar = document.getElementById('progress-bar');
	const pdfFrame = document.getElementById('pdf-frame');
	const downloadLink = document.getElementById('download-link');

	// Show progress bar and hide other elements
	progressBar.style.width = '0%';
	progressBar.textContent = '0%';
	pdfFrame.style.display = 'none';
	downloadLink.style.display = 'none';

	for (let i = 1; i <= totalPages; i++) {
		const page = await pdf.getPage(i);
		const viewport = page.getViewport({ scale: 3 });

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = viewport.width;
		canvas.height = viewport.height;

		await page.render({
			canvasContext: context,
			viewport: viewport
		}).promise;

		const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
		const data = imgData.data;

		for (let j = 0; j < data.length; j += 4) {
			const avg = (data[j] + data[j + 1] + data[j + 2]) / 3;
			const bwColor = avg > threshold ? 255 : 0;
			data[j] = data[j + 1] = data[j + 2] = bwColor;
		}

		context.putImageData(imgData, 0, 0);

		const img = canvas.toDataURL('image/png');
		const embeddedImage = await pdfDoc.embedPng(img);
		const newPage = pdfDoc.addPage([canvas.width, canvas.height]);
		newPage.drawImage(embeddedImage, {
			x: 0,
			y: 0,
			width: canvas.width,
			height: canvas.height
		});

		progressBar.style.width = `${(i / totalPages) * 100}%`;
		progressBar.textContent = `${Math.round((i / totalPages) * 100)}%`;
	}

	const pdfBytes = await pdfDoc.save();

	const blob = new Blob([pdfBytes], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);

	pdfFrame.style.display = 'block';

	pdfFrame.src = url;

	const fileName = file.name.replace('.pdf', '_REDUCED.pdf');
	downloadLink.href = url;
	downloadLink.download = fileName;
	downloadLink.style.display = 'block';

	document.title = 'PDF Quality Reducer';
});

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') {
		setTimeout(() => {
			document.title = 'PDF processing...';
		}, 1000);
	} else {
		document.title = 'PDF Quality Reducer';
	}
});
