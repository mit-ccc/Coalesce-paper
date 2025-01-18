
# Create a class called MongoDB that will be used to interact with the database

import json
from datetime import datetime
from bson.objectid import ObjectId
# from passwords import passphrase

class MongoDB:
    def __init__(self, client):
        self.client = client
        self.db = client.flask_db

    # Functions for setting up the database

    def wipe(self):
        """
        Deletes all collections in the database
        """
        for collection in self.db.list_collection_names():
            self.db.drop_collection(collection)

    def delete_user(self, user_id):
        """
        Deletes a user from the users collection
        """
        # delete all the projects for the user from the projects collection
        projects = self.get_user_projects(user_id)
        for project in projects:
            # delete all the cells for the project from the cells collection
            self.delete_cells(project["project_id"])
            # delete the project from the projects collection
            self.delete_project(project["project_id"])
        # delete the user from the users collection
        self.db.users.delete_one({"user_id": user_id})

    def setup(self):
        """
        Sets up the database with the following collections:

        - "users"
        - "projects"
        - "cells"
        - "topic_suggestions"
        - "prompts"
        - "user_events"
        """

        self.db.create_collection("users")

        self.db.create_collection("projects")

        self.db.create_collection("cells")

        # self.db.create_collection("topic_suggestions")

        self.db.create_collection("prompts")

        self.db.create_collection("user_events")
        # set the user_id and project_id as the key for the user_events collection
        self.db.user_events.create_index(
            [("user_id", 1), ("project_id", 1)], unique=True)
        
    def add_multiple_users(self, user_ids):
        """
        Adds multiple users to the database
        """
        for user_id in user_ids:
            self.add_user(user_id)

    def setup_test_data(self, user_ids, test_project_file=""):
        """
        Sets up database with each email as a usercode
        If the test_project_file is provided, it will load the project into the database for each user
        Need to generate unique project and cell ids for each test project
        For the cell_ids just take the old ones and append the user_id to the end
        """
        # create a user for each email
        for user_id in user_ids:
            # add a passphrase to the end of the email to create a user_id
            # user_id = f"{email}+{passphrase}"
            self.add_user(user_id)

            # if the test project file is provided, load the project into the database
            # if a test project file is provided, load the test data
            test_project = {}
            if test_project_file != "":
                with open(test_project_file) as f:
                    test_project = json.load(f)
                project_id = self.add_project(
                    user_id, test_project["project_title"])
                processed_sections = []
                for section in test_project["sections_with_cells"]:
                    section_doc = {"id": section["id"], "title": section["title"], "cells": []}
                    for cell in section["cells"]:
                        # append the user_id to the cell_id
                        cell_id = f"{cell['cell_id']}+{user_id}"
                        # add the cell to the cells collection
                        self.add_cell(project_id, cell_id,
                                      cell["cell_details"],
                                      cell["section_index"],
                                      cell["last_updated"],
                                      cell["human_ai_status"],
                                      cell["ai_rationale"],
                                      cell["time_estimate"])
                        section_doc["cells"].append(cell_id)
                    processed_sections.append(section_doc)

                # also update all the cell_ids in the analyze_topics_info field
                analyze_topics_info = test_project["analyze_topics_info"]
                for topic in analyze_topics_info["topics"]:
                    new_cells = []
                    for cell in analyze_topics_info["topics"][topic]["cells"]:
                        new_cells.append(f"{cell}+{user_id}")
                    analyze_topics_info["topics"][topic]["cells"] = new_cells

                # do the same for any delete suggestions in the suggestions field in analyze_topics_info
                for topic in analyze_topics_info["suggestions"]:
                    for suggestion in analyze_topics_info["suggestions"][topic]:
                        if suggestion["suggestion_type"] == "delete":
                            for cell in suggestion["suggestions"]:
                                cell["cell_id"] = f"{
                                    cell['cell_id']}+{user_id}"

                # print(analyze_topics_info)

                # update the sections, analyze_topics_info, and context_response in the projects collection
                self.edit_project_fields(
                    project_id, {"sections": processed_sections,
                                 "analyze_topics_info": analyze_topics_info,
                                 "context_response": test_project["context_response"]})

                # update the user's projects list
                self.add_user_project(
                    user_id, project_id, test_project["project_title"])

                # break # for testing TODO: uncomment

    def get_users_with_projects(self):
        """
        Returns a list of user_ids that have projects
        """
        users_with_projects = []
        for user in self.db.users.find():
            if len(user["projects"]) > 0:
                users_with_projects.append(user["user_id"])
        return users_with_projects

    # Functions for interacting with the users collection

    def add_user(self, user_id):
        """
        Inserts a user into the users collection, with the following fields:

        - "projects": empty list
        """
        # insert the user into the users collection
        user_doc = {"user_id": user_id, "projects": []}
        self.db.users.insert_one(user_doc)

    def verify_user(self, user_id):
        """
        Verifies that a user exists in the users collection

        Returns True if the user exists, False if not
        """
        # check to see if the user_id exists in the users collection
        return self.db.users.find_one({"user_id": user_id}) is not None

    def get_user_projects(self, user_id):
        """
        Returns a list of project ids and titles for the user
        """
        # get the user from the users collection
        user = self.db.users.find_one({"user_id": user_id})
        if user is None:
            return None
        # return the projects list
        return user["projects"]

    def add_user_project(self, user_id, project_id, project_title):
        """
        Appends a project id and title to the list of projects for the user
        """
        # get the user from the users collection
        user = self.db.users.find_one({"user_id": user_id})
        if user is None:
            return None
        # append the project id and title to the projects list
        user["projects"].append(
            {"project_id": project_id, "project_title": project_title})
        # update the user in the users collection
        self.db.users.update_one({"user_id": user_id}, {
                                 "$set": {"projects": user["projects"]}})

    def delete_user_project(self, user_id, project_id):
        """
        Deletes a project id and title from the list of projects for the user
        """
        # get the user from the users collection
        user = self.db.users.find_one({"user_id": user_id})
        if user is None:
            return None
        # remove the project from the projects list
        user["projects"] = [
            project for project in user["projects"] if project["project_id"] != project_id]
        # update the user in the users collection
        self.db.users.update_one({"user_id": user_id}, {
                                 "$set": {"projects": user["projects"]}})

    def edit_project_title(self, user_id, project_id, new_title):
        """
        Replaces the project title for the user
        """
        # get the user from the users collection
        user = self.db.users.find_one({"user_id": user_id})
        if user is None:
            return None
        # find the project in the projects list
        for project in user["projects"]:
            if project["project_id"] == project_id:
                project["project_title"] = new_title
                break
        # update the user in the users collection
        self.db.users.update_one({"user_id": user_id}, {
            "$set": {"projects": user["projects"]}})

    # Functions for interacting with the projects collection

    def add_project(self, user_id, title=""):
        """
        Inserts a project into the projects collection, with the following fields:

        - "project_title": string
        - "user_id"
        - "analyze_topics_info": empty dictionary (same structure as "analyzeTopicsSlice" in Redux Store)
        - "human_topics": empty dictionary (same structure as "human_topics" in Redux Store)
        - "sections": empty list (reference notes in "DB Brainstorming" for structure of sections list)
        - "context_response": empty dictionary (reference notes in "DB Brainstorming" for structure of context_response list)

        Returns the project_id of the new project
        """
        # insert the project into the projects collection
        project_doc = {"project_title": title, "user_id": user_id,
                       "analyze_topics_info": {}, "human_topics": {}, "sections": [],
                       "context_response": {}}
        result = self.db.projects.insert_one(project_doc)
        # return the string representation of the ObjectId
        # print(str(result.inserted_id))
        return str(result.inserted_id)

    def get_project(self, project_id):
        """
        Returns a project from the projects collection
        """
        # get the project from the projects collection
        project = self.db.projects.find_one({"_id": ObjectId(project_id)})
        if project is None:
            return None
        # return the project
        return project

    def get_field_in_project(self, project_id, field):
        """
        Returns a field from a project in the projects collection
        """
        # get the project from the projects collection
        project = self.db.projects.find_one({"_id": ObjectId(project_id)})
        if project is None:
            return None
        # return the field
        return project[field]

    def edit_project_fields(self, project_id, new_fields):
        """
        Replaces the fields of a project with new fields.
        new_fields is a dictionary with the fields to be replaced
        project_id is the string representation of the ObjectId
        """
        # print(project_id)
        # update the project in the projects collection
        self.db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": new_fields}
        )

    def delete_project(self, project_id):
        """
        Deletes a project from the projects collection
        """
        # delete the project from the projects collection
        self.db.projects.delete_one({"_id": ObjectId(project_id)})

    # NOTE: not needed for now
    # def duplicate_project(self, project_id, user_id):
    #     """
    #     Duplicates a project in the projects collection and returns the new project_id
    #     """
    #    pass

    # Functions for interacting with the cells collection

    def add_cell(self, project_id, cell_id, cell_details, section_index,
                 last_updated="", human_ai_status="human", ai_rationale="", time_estimate=0):
        """
        Inserts a cell into the cells collection. 
        The cell_details is a dictionary with the following fields:

        - "cell_type": "text" or "question"
        - "response_format": "open" or "closed" (only for question cells)
        - "description": string (only for question cells)
        - "main_text": string
        - "response_categories": list of jsons (only for closed question cells)

        In addition to cell_details, the cell will also have the following fields:
        - "project_id"
        - "cell_id": string
        - "section_index": integer
        - "last_updated": timestamp
        - [DROPPED] "checks": empty list (reference notes in "DB Brainstorming" for structure of checks list)
        - [DROPPED] "last_checked": empty string
        - [DROPPED] "question_type": "behavioral", "attitudinal", "demographic" (only for question cells)
        - [DROPPED] "is_ai_generated": 0 or 1
        - "human_ai_status": "human" or "ai" or "human_ai"
        - "ai_rationale": empty string
        - "time_estimate": in minutes

        Returns the cell_id of the new cell
        """

        # if the cell_id already exists, don't do anything
        if self.db.cells.find_one({"cell_id": cell_id}) is not None:
            return cell_id

        if last_updated == "":
            last_updated = datetime.now().isoformat()
            # print(last_updated)

        # insert the cell into the cells collection
        cell_doc = {
            "project_id": project_id,
            "cell_id": cell_id,
            "cell_details": cell_details,
            "section_index": section_index,
            "last_updated": last_updated,
            # "checks": [],
            # "last_checked": "",
            # "question_type": question_type,
            # "is_ai_generated": is_ai_generated,
            "human_ai_status": human_ai_status,
            "ai_rationale": ai_rationale,
            "time_estimate": time_estimate
        }
        result = self.db.cells.insert_one(cell_doc)
        # return the string representation of the ObjectId
        # return str(result.inserted_id)
        return cell_id

    def edit_cell_fields(self, cell_id, new_fields):
        """
        Replaces the fields of a cell with new fields.
        new_fields is a dictionary with the fields to be replaced
        """
        # update the cell in the cells collection
        self.db.cells.update_one(
            {"cell_id": cell_id},
            {"$set": new_fields}
        )

    def delete_cell(self, cell_id):
        """
        Deletes a cell from the cells collection 
        """
        # delete the cell from the cells collection
        self.db.cells.delete_one({"cell_id": cell_id})

    def delete_cells(self, project_id):
        """
        Deletes all cells from the cells collection for a project
        """
        # delete all the cells for the project from the cells collection
        self.db.cells.delete_many({"project_id": project_id})

    def get_cells(self, project_id):
        """
        Returns all cells from the cells collection for a project
        """
        # get the cells from the cells collection
        cells = self.db.cells.find({"project_id": project_id})
        if cells is None:
            return None
        # return the cells
        return cells

    def get_field_in_cell(self, cell_id, field):
        """
        Returns a field from a cell in the cells collection
        """
        # get the cell from the cells collection
        cell = self.db.cells.find_one({"cell_id": cell_id})
        if cell is None:
            return None
        # return the field
        return cell[field]

    # Functions for interacting with the prompts collection

    def add_prompt(self, project_id, module_name, prompt_inputs, prompt_outputs):
        """
        Inserts a prompt into the prompts collection, with the following fields:

        - "project_id"
        - "module_name": string
        - "prompt_inputs": dictionary
        - "prompt_outputs": dictionary
        - "time_created": timestamp

        NOTE: the prompts collection will only be used for analysis
        """
        # insert the prompt into the prompts collection
        prompt_doc = {
            "project_id": project_id,
            "module_name": module_name,
            "prompt_inputs": prompt_inputs,
            "prompt_outputs": prompt_outputs,
            "time_created": datetime.now().isoformat()
        }
        self.db.prompts.insert_one(prompt_doc)

    # Functions for interacting with the user_events collection

    def add_events(self, user_id, project_id, new_events):
        """
        Appends a list of events to the user events for a project
        """
        # get the user events from the user_events collection
        user_events = self.db.user_events.find_one(
            {"user_id": user_id, "project_id": project_id})
        if user_events is None:
            # if the user events don't exist, create them
            user_events = {"user_id": user_id,
                           "project_id": project_id, "events": new_events}
            self.db.user_events.insert_one(user_events)
            return
        else:
            # go through new_events and append them if their timeStamp is greater than the last event in the list
            for event in new_events:
                if len(user_events["events"]) == 0 or event["timeStamp"] > user_events["events"][-1]["timeStamp"]:
                    user_events["events"].append(event)
            # # append the events to the events list
            # user_events["events"] += new_events
            # update the user events in the user_events collection
            self.db.user_events.update_one(
                {"user_id": user_id, "project_id": project_id},
                {"$set": {"events": user_events["events"]}}
            )

    # Functions for saving data from the database to a file

    def save_prompts_to_file(self, file_path):
        """
        Saves all prompts to a file in JSON format
        """
        # get all prompts from the prompts collection
        prompts = self.db.prompts.find({})
        if prompts is None:
            return
        
        cleaned_prompts = []
        
        # remove all the ObjectIds
        for prompt in prompts:
            prompt.pop("_id")
            cleaned_prompts.append(prompt)
        
        # get date for the file name
        timestamp = datetime.today().strftime('%Y-%m-%d')

        # save the prompts to the file
        with open(f"{file_path}/{timestamp}_prompts.json", "w") as f:
            json.dump(cleaned_prompts, f, indent=4)

    def save_user_events_to_file(self, file_path):
        """
        Saves all user events to a file in JSON format
        """
        # get all user events from the user_events collection
        user_events = self.db.user_events.find({})
        if user_events is None:
            return
        
        cleaned_user_events = []
        
        # remove all the ObjectIds
        for user_event in list(user_events):
            user_event.pop("_id")
            cleaned_user_events.append(user_event)

        # get timestamp for the file
        timestamp = datetime.today().strftime('%Y-%m-%d')

        # save the user events to the file
        with open(f"{file_path}/{timestamp}_user_events.json", "w") as f:
            json.dump(cleaned_user_events, f, indent=4)

    def save_project_to_file(self, project_id):
        """
        Saves a project to a file in JSON format
        """
        # get the project from the projects collection
        project = self.db.projects.find_one({"_id": ObjectId(project_id)})
        if project is None:
            return

        # drop the _id field
        project.pop("_id")

        # add cells to the project
        processed_sections = []
        for section in project["sections"]:
            section_doc = {"id": section["id"], "title": section["title"], "cells": []}
            for cell_id in section["cells"]:
                cell = self.db.cells.find_one({"cell_id": cell_id})
                if cell is not None:
                    # drop the _id field
                    cell.pop("_id")
                    section_doc["cells"].append(cell)
            processed_sections.append(section_doc)

        project["sections_with_cells"] = processed_sections

        project["project_id"] = project_id

        return project


    def save_user_projects_to_file(self, user_id, file_path):
        """
        Saves all projects for a user to one JSON file
        """
        # get the user's projects
        projects = self.get_user_projects(user_id)

        cleaned_projects = []

        # iterate through project and save each one to a file
        for project in projects:
            cleaned_projects.append(self.save_project_to_file(project["project_id"]))

        # get timestamp for the file
        timestamp = datetime.today().strftime('%Y-%m-%d')

        # save the project to the file
        with open(f"{file_path}/{timestamp}_projects_{user_id}.json", "w") as f:
            json.dump(cleaned_projects, f, indent=4)
