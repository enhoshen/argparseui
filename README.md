# ArgparseUI

Launch a `Flask` web ui to convert your `argparse.ArgumentParser` to html input forms.

- each argument comes with a paste from clipboard and run button
- run button calls your python script with the command line arguments you fill in

## Installation

Install the package using pip:

```bash
python -m pip install .
```

## Usage

Pass your parser returned by `argparse.ArgumentParser` to `argparseui.core.App`.
Run the flask web page by calling `App.run()`

```bash
python examples/app.py
```
