# Server

## Local Development Instructions

1. activate the virtual environment
```
conda activate coalesce
```

2. to run the server, `cd server/` and then run `python server.py`

### Other development notes
- when you install new Python libraries, update `requirements.txt` via 
```
pip3 freeze > requirements.txt
```

## First-Time Setup Instructions

1. make sure you are cd'd into the `server` folder in the terminal 

2. create a virtual environment via [conda](https://conda.io/projects/conda/en/latest/user-guide/getting-started.html#managing-python) or [venv](https://docs.python.org/3/library/venv.html) 
```
conda create -n coalesce python
```
- Note from CO: I installed miniconda ([source](https://docs.conda.io/projects/miniconda/en/latest/)) and then connected it to VSC ([source](https://saturncloud.io/blog/activating-anaconda-environment-in-vscode-a-guide-for-data-scientists/)).

3. activate the environment
```
conda activate coalesce
```

4. install the python packages. Note if you get an error about pywin delete it from the `requirements.txt` 
```
pip install -r requirements.txt
```

5. manually create `passwords.py` file in the `/server` folder, and add the following 
    - `open_ai_api_key`: imported in `dspy_accessor.py` 
    - `mongodb_uri`: imported in `server.py`
    - `flask_secret_key`: imported in `server.py`
    - `redis_broker_url`: imported in `server.py`

